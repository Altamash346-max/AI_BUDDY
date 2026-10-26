import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js";
import { extractTextFromFile, detectFileKind } from "../utils/resumeParser.js";
import { CandidateProfile } from "../models/candidateProfile.model.js";

// Long LinkedIn exports run to several pages; the AI only needs the substance
const MAX_TEXT_CHARS = 12000;
// Below this, extraction most likely failed (scanned or unusual PDF)
const MIN_TEXT_CHARS = 200;

const PROFILE_SHAPE = `Return ONLY valid JSON in exactly this shape, no extra text:
{
  "skills": ["string"],
  "projects": [
    { "name": "string", "description": "string", "techUsed": ["string"] }
  ],
  "experience": ["string — one entry per role, summarized in one line"],
  "education": ["string — one entry per degree/institution"]
}`;

const EXTRACTION_RULES = `You are an expert resume parser. Extract structured information about the candidate.
The input may be a resume, a LinkedIn profile export ("Save to PDF"), or both. LinkedIn exports
have a side column (Contact, Top Skills, Languages, Certifications) mixed into the main text and
page footers like "Page 1 of 3": ignore the footers and merge everything about the same person.
Treat LinkedIn "Experience" entries as experience and "Projects" entries as projects.`;

const buildProfileExtractionPrompt = (resumeText, linkedinText) => {
    return `${EXTRACTION_RULES}

${resumeText ? `RESUME TEXT:\n${resumeText.slice(0, MAX_TEXT_CHARS)}` : ""}

${linkedinText ? `LINKEDIN PROFILE TEXT:\n${linkedinText.slice(0, MAX_TEXT_CHARS)}` : ""}

${PROFILE_SHAPE}`;
};

// Fallback when text extraction gets little or nothing: Gemini reads the PDF itself
const buildPdfParts = (pdfFiles, otherText) => [
    ...pdfFiles.map((f) => ({ inlineData: { mimeType: "application/pdf", data: f.buffer.toString("base64") } })),
    {
        text: `${EXTRACTION_RULES}\n\nThe attached PDF file(s) are the candidate's documents.${
            otherText ? `\n\nMORE TEXT FROM THE SAME CANDIDATE:\n${otherText}` : ""
        }\n\n${PROFILE_SHAPE}`
    }
];

const toStringList = (v) =>
    (Array.isArray(v) ? v : []).map((s) => String(s ?? "").trim()).filter(Boolean);

// The AI sometimes leaves out a project's description or tech list; the schema requires them
const normalizeProfile = (parsed) => ({
    skills: [...new Set(toStringList(parsed?.skills))],
    projects: (Array.isArray(parsed?.projects) ? parsed.projects : [])
        .filter((p) => p?.name)
        .map((p) => ({
            name: String(p.name).trim(),
            description: String(p.description || p.name).trim(),
            techUsed: toStringList(p.techUsed)
        })),
    experience: toStringList(parsed?.experience),
    education: toStringList(parsed?.education)
});

// POST /api/interview/profile/upload
// multipart/form-data fields: resume and/or linkedin (at least one). A new upload replaces the old profile.
const uploadResume = asyncHandler(async (req, res) => {
    const resumeFile = req.files?.resume?.[0];
    const linkedinFile = req.files?.linkedin?.[0];

    if (!resumeFile && !linkedinFile) {
        throw new ApiError(400, "Upload a resume or a LinkedIn profile PDF");
    }

    const [resumeText, linkedinText] = await Promise.all([
        resumeFile ? extractTextFromFile(resumeFile) : "",
        linkedinFile ? extractTextFromFile(linkedinFile) : ""
    ]);

    const docs = [
        { file: resumeFile, text: resumeText.trim() },
        { file: linkedinFile, text: linkedinText.trim() }
    ].filter((d) => d.file);
    const unreadPdfs = docs.filter((d) => detectFileKind(d.file) === "pdf" && d.text.length < MIN_TEXT_CHARS);

    let prompt;
    if (unreadPdfs.length > 0) {
        // Gemini reads the PDFs it couldn't get text from; any text we did get rides along
        const readText = docs.filter((d) => !unreadPdfs.includes(d)).map((d) => d.text.slice(0, MAX_TEXT_CHARS)).join("\n\n");
        prompt = buildPdfParts(unreadPdfs.map((d) => d.file), readText);
    } else if (docs.some((d) => d.text.length >= MIN_TEXT_CHARS)) {
        prompt = buildProfileExtractionPrompt(resumeText.trim(), linkedinText.trim());
    } else {
        throw new ApiError(422, "Could not read any text from this file. Try a PDF or DOCX version.");
    }

    const parsed = normalizeProfile(await generateJsonFromPrompt(prompt));
    if (!parsed.skills.length && !parsed.projects.length && !parsed.experience.length && !parsed.education.length) {
        throw new ApiError(422, "The AI could not find skills, projects or experience in this file. Check it is the right document.");
    }

    const profile = await CandidateProfile.findOneAndUpdate(
        { userId: req.user._id },
        {
            userId: req.user._id,
            resumeText,
            linkedinText,
            parsedSkills: parsed.skills,
            parsedProjects: parsed.projects,
            parsedExperience: parsed.experience,
            parsedEducation: parsed.education,
            updatedAt: new Date()
        },
        { upsert: true, returnDocument: "after" }
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

// DELETE /api/interview/profile
const deleteMyProfile = asyncHandler(async (req, res) => {
    const result = await CandidateProfile.deleteOne({ userId: req.user._id });

    if (result.deletedCount === 0) {
        throw new ApiError(404, "No resume to delete");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Resume and extracted profile deleted"));
});

export { uploadResume, getMyProfile, deleteMyProfile };
