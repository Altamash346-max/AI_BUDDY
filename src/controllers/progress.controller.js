import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Progress } from "../models/progress.model.js";
import { Topic } from "../models/topic.model.js";
import { Roadmap } from "../models/roadmap.model.js";

// Streak continues if the user's last completion was today or yesterday, else resets to 1.
const calculateStreak = async (userId, topicId) => {
    const lastCompleted = await Progress.findOne({
        userId,
        completed: true,
        topicId: { $ne: topicId }
    }).sort({ completedAt: -1 });

    if (!lastCompleted || !lastCompleted.completedAt) {
        return 1;
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((new Date() - lastCompleted.completedAt) / oneDayMs);

    if (diffDays === 0 || diffDays === 1) {
        return (lastCompleted.streak || 0) + 1;
    }

    return 1;
};

// POST /api/progress/complete  { topicId }
const markTopicComplete = asyncHandler(async (req, res) => {
    const { topicId } = req.body;

    if (!topicId) {
        throw new ApiError(400, "topicId is required");
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }

    // Confirm this topic belongs to a roadmap owned by the logged-in user
    const roadmap = await Roadmap.findOne({ _id: topic.roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(403, "You do not have access to this topic");
    }

    const streak = await calculateStreak(req.user._id, topicId);

    const progress = await Progress.findOneAndUpdate(
        { userId: req.user._id, topicId },
        {
            userId: req.user._id,
            topicId,
            completed: true,
            streak,
            completedAt: new Date()
        },
        { upsert: true, new: true }
    );

    topic.status = "completed";
    await topic.save();

    // Unlock the next topic in order, if it's still locked
    const nextTopic = await Topic.findOne({
        roadmapId: topic.roadmapId,
        order: topic.order + 1
    });

    if (nextTopic && nextTopic.status === "locked") {
        nextTopic.status = "current";
        await nextTopic.save();
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { progress, nextTopic }, "Topic marked as complete"));
});

// GET /api/progress/roadmap/:roadmapId
const getProgressForRoadmap = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const topics = await Topic.find({ roadmapId }).sort({ order: 1 });
    const progressEntries = await Progress.find({
        userId: req.user._id,
        topicId: { $in: topics.map((t) => t._id) }
    });

    const progressByTopic = new Map(progressEntries.map((p) => [p.topicId.toString(), p]));

    const topicsWithProgress = topics.map((t) => ({
        ...t.toObject(),
        progress: progressByTopic.get(t._id.toString()) || null
    }));

    const completedCount = topics.filter((t) => t.status === "completed").length;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                topics: topicsWithProgress,
                completedCount,
                totalCount: topics.length,
                percentComplete: topics.length
                    ? Math.round((completedCount / topics.length) * 100)
                    : 0
            },
            "Progress fetched successfully"
        )
    );
});

// GET /api/progress/stats
const getMyProgressStats = asyncHandler(async (req, res) => {
    const progressEntries = await Progress.find({ userId: req.user._id, completed: true });

    const currentStreak = progressEntries.reduce(
        (max, p) => Math.max(max, p.streak || 0),
        0
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalTopicsCompleted: progressEntries.length,
                currentStreak
            },
            "Stats fetched successfully"
        )
    );
});

export { markTopicComplete, getProgressForRoadmap, getMyProgressStats };
