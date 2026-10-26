import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFast } from "../utils/geminiclient.js";
import { Quiz } from "../models/quiz.model.js";
import { Topic } from "../models/topic.model.js";
import { Roadmap } from "../models/roadmap.model.js";

const buildQuizPrompt = (topicTitle) => {
    return `Create a 5-question multiple-choice quiz on: "${topicTitle}". Each question has 4 options, one correct.
Return ONLY this JSON, no extra text:
{"questions":[{"question":"string","options":["string","string","string","string"],"correctOptionIndex":0}]}`;
};

const verifyTopicOwnership = async (topicId, userId) => {
    // Run both DB lookups in parallel instead of sequentially
    const [topic] = await Promise.all([
        Topic.findById(topicId),
        // We check roadmap ownership below once we know the topic's roadmapId
    ]);
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }
    const roadmap = await Roadmap.findOne({ _id: topic.roadmapId, userId });
    if (!roadmap) {
        throw new ApiError(403, "You do not have access to this topic");
    }
    return topic;
};

// POST /api/quiz/:topicId/generate
const generateQuiz = asyncHandler(async (req, res) => {
    const { topicId } = req.params;
    const topic = await verifyTopicOwnership(topicId, req.user._id);

    let quiz = await Quiz.findOne({ topicId });
    if (quiz) {
        // Strip correct answers before sending — don't expose them in the generate response
        const sanitized = {
            _id: quiz._id,
            topicId: quiz.topicId,
            questions: quiz.questions.map((q) => ({
                _id: q._id,
                question: q.question,
                options: q.options
            }))
        };
        return res
            .status(200)
            .json(new ApiResponse(200, sanitized, "Quiz already exists for this topic"));
    }

    const prompt = buildQuizPrompt(topic.title);
    const aiResponse = await generateJsonFast(prompt);

    if (!aiResponse?.questions || !Array.isArray(aiResponse.questions) || aiResponse.questions.length === 0) {
        throw new ApiError(502, "AI response did not contain valid quiz questions");
    }

    quiz = await Quiz.create({
        topicId,
        questions: aiResponse.questions
    });

    // Strip correct answers before returning — client should not see them in network tab
    const newSanitized = {
        _id: quiz._id,
        topicId: quiz.topicId,
        questions: quiz.questions.map((q) => ({
            _id: q._id,
            question: q.question,
            options: q.options
        }))
    };

    return res.status(201).json(new ApiResponse(201, newSanitized, "Quiz generated successfully"));
});

// GET /api/quiz/:topicId
const getQuizForTopic = asyncHandler(async (req, res) => {
    const { topicId } = req.params;
    await verifyTopicOwnership(topicId, req.user._id);

    const quiz = await Quiz.findOne({ topicId });
    if (!quiz) {
        throw new ApiError(404, "No quiz found for this topic yet — generate one first");
    }

    // Strip correct answers before sending — don't let the client see them in the network tab
    const sanitized = {
        _id: quiz._id,
        topicId: quiz.topicId,
        questions: quiz.questions.map((q) => ({
            _id: q._id,
            question: q.question,
            options: q.options
        }))
    };

    return res.status(200).json(new ApiResponse(200, sanitized, "Quiz fetched successfully"));
});

// POST /api/quiz/:topicId/submit  { answers: [optionIndex, optionIndex, ...] }
const submitQuiz = asyncHandler(async (req, res) => {
    const { topicId } = req.params;
    const { answers } = req.body;
    const topic = await verifyTopicOwnership(topicId, req.user._id);

    if (!Array.isArray(answers)) {
        throw new ApiError(400, "answers must be an array of selected option indexes");
    }

    const quiz = await Quiz.findOne({ topicId });
    if (!quiz) {
        throw new ApiError(404, "No quiz found for this topic");
    }

    if (answers.length !== quiz.questions.length) {
        throw new ApiError(400, `Expected ${quiz.questions.length} answers, got ${answers.length}`);
    }

    let correctCount = 0;
    const results = quiz.questions.map((q, i) => {
        const isCorrect = answers[i] === q.correctOptionIndex;
        if (isCorrect) correctCount++;
        return {
            question: q.question,
            selected: answers[i],
            correctOptionIndex: q.correctOptionIndex,
            isCorrect
        };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    // Remember the latest score so the roadmap can adapt to weak topics
    topic.quizScore = score;
    await topic.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { score, correctCount, total: quiz.questions.length, results },
            "Quiz submitted successfully"
        )
    );
});

export { generateQuiz, getQuizForTopic, submitQuiz };
