import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js";
import { extractTextFromBuffer } from "../utils/resumeParser.js";
import { CandidateProfile } from "../models/candidateProfile.model.js";

const buildProfileExtractionPrompt = (resumeText, linkedinText) => {
    return `You are an expert resume parser. Extract structured information from the text below.

RESUME TEXT:
${resumeText}

${linkedinText ? `LINKEDIN TEXT:\n${linkedinText}` : ""}

Return ONLY valid JSON in exactly this shape, no extra text:
{
  "skills": ["string"],
  "projects": [
    { "name": "string", "description": "string", "techUsed": ["string"] }
  ],
  "experience": ["string — one entry per role, summarized in one line"],
  "education": ["string — one entry per degree/institution"]
}`;
};

// POST /api/interview/profile/upload
// multipart/form-data fields: resume (required), linkedin (optional)
const uploadResume = asyncHandler(async (req, res) => {
    const resumeFile = req.files?.resume?.[0];
    const linkedinFile = req.files?.linkedin?.[0];

    if (!resumeFile) {
        throw new ApiError(400, "Resume file is required");
    }

    const resumeText = await extractTextFromBuffer(resumeFile.buffer, resumeFile.mimetype);
    const linkedinText = linkedinFile
        ? await extractTextFromBuffer(linkedinFile.buffer, linkedinFile.mimetype)
        : undefined;

    if (!resumeText || resumeText.trim().length < 20) {
        throw new ApiError(422, "Could not extract readable text from the resume. Try a different file.");
    }

    const prompt = buildProfileExtractionPrompt(resumeText, linkedinText);
    const parsed = await generateJsonFromPrompt(prompt);

    const profile = await CandidateProfile.findOneAndUpdate(
        { userId: req.user._id },
        {
            userId: req.user._id,
            resumeText,
            linkedinText,
            parsedSkills: parsed.skills || [],
            parsedProjects: parsed.projects || [],
            parsedExperience: parsed.experience || [],
            parsedEducation: parsed.education || [],
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Resume parsed and profile updated successfully"));
});

// GET /api/interview/profile
const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await CandidateProfile.findOne({ userId: req.user._id });

    if (!profile) {
        throw new ApiError(404, "No candidate profile found. Upload a resume first.");
    }

    return res.status(200).json(new ApiResponse(200, profile, "Profile fetched successfully"));
});

export { uploadResume, getMyProfile };
