import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js";
import { StudyPlanner } from "../models/studyPlanner.model.js";
import { Roadmap } from "../models/roadmap.model.js";
import { Topic } from "../models/topic.model.js";

const buildPlannerPrompt = ({ roadmap, topics }) => {
    const topicList = topics.map((t) => t.title).join(", ");
    return `You are a study planning assistant. Create a day-by-day study plan.

Subject: ${roadmap.subject}
Level: ${roadmap.level}
Time available: ${roadmap.timeAvailable}
Topics to cover in order: ${topicList}

Break this into daily tasks and weekly milestones that realistically fit the time available.

Return ONLY valid JSON in exactly this shape, no extra text:
{
  "dailyTasks": [{ "day": "Day 1", "task": "string" }],
  "weeklyMilestones": [{ "week": "Week 1", "goal": "string" }]
}`;
};

// POST /api/planner/generate/:roadmapId
const generateStudyPlan = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const existingPlan = await StudyPlanner.findOne({ roadmapId });
    if (existingPlan) {
        return res.status(200).json(new ApiResponse(200, existingPlan, "Study plan already exists"));
    }

    const topics = await Topic.find({ roadmapId }).sort({ order: 1 });
    if (topics.length === 0) {
        throw new ApiError(400, "This roadmap has no topics yet");
    }

    const prompt = buildPlannerPrompt({ roadmap, topics });
    const aiResponse = await generateJsonFromPrompt(prompt);

    if (!Array.isArray(aiResponse?.dailyTasks) || !Array.isArray(aiResponse?.weeklyMilestones)) {
        throw new ApiError(502, "AI response did not contain a valid study plan");
    }

    const weekCount = aiResponse.weeklyMilestones.length;
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + weekCount * 7);

    const plan = await StudyPlanner.create({
        roadmapId,
        dailyTasks: aiResponse.dailyTasks,
        weeklyMilestones: aiResponse.weeklyMilestones,
        estimatedCompletionDate
    });

    return res.status(201).json(new ApiResponse(201, plan, "Study plan generated successfully"));
});

// GET /api/planner/:roadmapId
const getStudyPlan = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const plan = await StudyPlanner.findOne({ roadmapId });
    if (!plan) {
        throw new ApiError(404, "No study plan found for this roadmap yet");
    }

    return res.status(200).json(new ApiResponse(200, plan, "Study plan fetched successfully"));
});

// PATCH /api/planner/:roadmapId/task/:taskId/toggle
const toggleTaskDone = asyncHandler(async (req, res) => {
    const { roadmapId, taskId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const plan = await StudyPlanner.findOne({ roadmapId });
    if (!plan) {
        throw new ApiError(404, "No study plan found for this roadmap");
    }

    const task = plan.dailyTasks.id(taskId);
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    task.done = !task.done;
    await plan.save();

    return res.status(200).json(new ApiResponse(200, plan, "Task updated"));
});

export { generateStudyPlan, getStudyPlan, toggleTaskDone };
