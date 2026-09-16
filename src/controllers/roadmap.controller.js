import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js"; // FIX: was "geminiClient.js" (wrong case)
import { Roadmap } from "../models/roadmap.model.js";
import { Topic } from "../models/topic.model.js";

const buildRoadmapPrompt = ({ subject, goal, level, timeAvailable }) => {
    return `You are an expert learning mentor. Create a personalized learning roadmap.

Subject: ${subject}
Goal: ${goal}
Current level: ${level}
Time available: ${timeAvailable}

Generate 8-12 topics in logical learning order. For each topic include 2-4 curated resources.

Return ONLY valid JSON in exactly this shape, no extra text:
{
  "topics": [
    {
      "title": "string",
      "order": 1,
      "resources": [
        { "title": "string", "url": "string", "type": "video" }
      ]
    }
  ]
}

Valid values for "type" are: video, article, documentation, course, practice, project.`;
};

// POST /api/roadmap/generate
const generateRoadmap = asyncHandler(async (req, res) => {
    const { subject, goal, level, timeAvailable } = req.body;

    if (!subject || !goal || !level || !timeAvailable) {
        throw new ApiError(400, "subject, goal, level, and timeAvailable are all required");
    }

    // FIX: was ["Placement", "College Exam", ...] — "College Exam" (singular) never matched
    // the model's enum value "College Exams" (plural), so a valid request from the model's
    // own schema was always rejected here first.
    const validGoals = ["Placement", "College Exams", "Hackathon", "Research", "Freelancing"];
    const validLevels = ["Beginner", "Intermediate", "Advanced"];

    if (!validGoals.includes(goal)) {
        throw new ApiError(400, `goal must be one of: ${validGoals.join(", ")}`);
    }
    if (!validLevels.includes(level)) {
        throw new ApiError(400, `level must be one of: ${validLevels.join(", ")}`);
    }

    const prompt = buildRoadmapPrompt({ subject, goal, level, timeAvailable });
    const aiResponse = await generateJsonFromPrompt(prompt);

    if (!aiResponse?.topics || !Array.isArray(aiResponse.topics) || aiResponse.topics.length === 0) {
        throw new ApiError(502, "AI response did not contain a valid topics list");
    }

    const roadmap = await Roadmap.create({
        userId: req.user._id,
        subject,
        goal,
        level,
        timeAvailable
    });

    const topicDocs = aiResponse.topics.map((t, index) => ({
        roadmapId: roadmap._id,
        title: t.title,
        order: t.order ?? index + 1,
        status: index === 0 ? "current" : "locked",
        resources: Array.isArray(t.resources) ? t.resources : []
    }));

    const topics = await Topic.insertMany(topicDocs);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { roadmap, topics },
                "Roadmap generated successfully"
            )
        );
});

// GET /api/roadmap/me
const getMyRoadmaps = asyncHandler(async (req, res) => {
    const roadmaps = await Roadmap.find({ userId: req.user._id }).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, roadmaps, "Roadmaps fetched successfully"));
});

// GET /api/roadmap/:roadmapId
const getRoadmapWithTopics = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });

    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const topics = await Topic.find({ roadmapId: roadmap._id }).sort({ order: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, { roadmap, topics }, "Roadmap fetched successfully"));
});

export { generateRoadmap, getMyRoadmaps, getRoadmapWithTopics };
