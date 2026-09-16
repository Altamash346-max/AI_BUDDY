import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js";
import { InterviewPrep } from "../models/interviewPrep.model.js";
import { CandidateProfile } from "../models/candidateProfile.model.js";

const buildInterviewPrompt = ({ profile, company, role, jobDescription }) => {
    const skills = (profile.parsedSkills || []).join(", ") || "Not specified";
    const projects =
        (profile.parsedProjects || [])
            .map((p) => `${p.name} (${(p.techUsed || []).join(", ")})`)
            .join("; ") || "Not specified";
    const experience = (profile.parsedExperience || []).join("; ") || "Not specified";

    return `You are an expert technical interviewer. Generate realistic interview questions for a candidate.

CANDIDATE SKILLS: ${skills}
CANDIDATE PROJECTS: ${projects}
CANDIDATE EXPERIENCE: ${experience}

TARGET COMPANY: ${company}
TARGET ROLE: ${role}
${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ""}

Do not use leaked or confidential interview questions. Base questions only on publicly known
interview patterns, the target role, and the candidate's actual background above.

Generate:
- 6 technical questions relevant to the role
- 4 project-based questions specific to the candidate's listed projects
- 4 behavioral questions
- 4 questions reflecting ${company}'s likely culture/values and hiring focus

Return ONLY valid JSON in exactly this shape, no extra text:
{
  "technical": ["string"],
  "projectBased": ["string"],
  "behavioral": ["string"],
  "culturalFit": ["string"]
}`;
};

// POST /api/interview/generate  { company, role, jobDescription? }
const generateInterviewPrep = asyncHandler(async (req, res) => {
    const { company, role, jobDescription } = req.body;

    if (!company || !role) {
        throw new ApiError(400, "company and role are required");
    }

    const profile = await CandidateProfile.findOne({ userId: req.user._id });
    if (!profile) {
        throw new ApiError(404, "No candidate profile found. Upload your resume first.");
    }

    const prompt = buildInterviewPrompt({ profile, company, role, jobDescription });
    const generatedQuestions = await generateJsonFromPrompt(prompt);

    const requiredKeys = ["technical", "projectBased", "behavioral", "culturalFit"];
    const isValid = requiredKeys.every((k) => Array.isArray(generatedQuestions?.[k]));
    if (!isValid) {
        throw new ApiError(502, "AI response did not contain a valid question set");
    }

    const interviewPrep = await InterviewPrep.create({
        userId: req.user._id,
        company,
        role,
        jobDescription: jobDescription || "Not provided",
        generatedQuestions
    });

    return res
        .status(201)
        .json(new ApiResponse(201, interviewPrep, "Interview questions generated successfully"));
});

// GET /api/interview/me
const getMyInterviewPreps = asyncHandler(async (req, res) => {
    const preps = await InterviewPrep.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, preps, "Interview preps fetched successfully"));
});

// GET /api/interview/:id
const getInterviewPrepById = asyncHandler(async (req, res) => {
    const prep = await InterviewPrep.findOne({ _id: req.params.id, userId: req.user._id });
    if (!prep) {
        throw new ApiError(404, "Interview prep not found");
    }
    return res.status(200).json(new ApiResponse(200, prep, "Interview prep fetched successfully"));
});

export { generateInterviewPrep, getMyInterviewPreps, getInterviewPrepById };
