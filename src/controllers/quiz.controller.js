import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js";
import { Quiz } from "../models/quiz.model.js";
import { Topic } from "../models/topic.model.js";
import { Roadmap } from "../models/roadmap.model.js";

const buildQuizPrompt = (topicTitle) => {
    return `You are an expert quiz creator. Create a multiple-choice quiz to test understanding of the topic: "${topicTitle}".

Generate exactly 5 questions. Each question must have exactly 4 options with only one correct answer.

Return ONLY valid JSON in exactly this shape, no extra text:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctOptionIndex": 0
    }
  ]
}`;
};

const verifyTopicOwnership = async (topicId, userId) => {
    const topic = await Topic.findById(topicId);
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
        return res
            .status(200)
            .json(new ApiResponse(200, quiz, "Quiz already exists for this topic"));
    }

    const prompt = buildQuizPrompt(topic.title);
    const aiResponse = await generateJsonFromPrompt(prompt);

    if (!aiResponse?.questions || !Array.isArray(aiResponse.questions) || aiResponse.questions.length === 0) {
        throw new ApiError(502, "AI response did not contain valid quiz questions");
    }

    quiz = await Quiz.create({
        topicId,
        questions: aiResponse.questions
    });

    return res.status(201).json(new ApiResponse(201, quiz, "Quiz generated successfully"));
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
    await verifyTopicOwnership(topicId, req.user._id);

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

    return res.status(200).json(
        new ApiResponse(
            200,
            { score, correctCount, total: quiz.questions.length, results },
            "Quiz submitted successfully"
        )
    );
});

export { generateQuiz, getQuizForTopic, submitQuiz };
