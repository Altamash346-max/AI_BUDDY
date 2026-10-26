import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFast } from "../utils/geminiclient.js";
import { Quiz } from "../models/quiz.model.js";
import { Topic } from "../models/topic.model.js";
import { Roadmap } from "../models/roadmap.model.js";

// A random angle per request so a regenerated quiz on the same topic asks different things
const QUIZ_ANGLES = [
    "core definitions and concepts",
    "predicting the output or result of a short example",
    "common mistakes and misconceptions",
    "real-world use cases and when to use what",
    "comparisons between similar ideas",
    "interview-style tricky questions",
    "step-by-step problem solving",
    "edge cases and limitations"
];

const pickRandom = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const buildQuizPrompt = (topicTitle, subject, previousQuestions) => {
    const angles = pickRandom(QUIZ_ANGLES, 2).join(" and ");
    const avoid = previousQuestions.length
        ? `\nDo NOT repeat or rephrase any of these earlier questions:\n${previousQuestions.map((q) => `- ${q}`).join("\n")}\n`
        : "";
    return `Create a NEW 5-question multiple-choice quiz on "${topicTitle}"${subject ? ` (part of learning ${subject})` : ""}.
Focus this time on ${angles}. Mix easy, medium and hard questions. Each question has 4 options, exactly one correct.
${avoid}
Return ONLY this JSON, no extra text:
{"questions":[{"question":"string","options":["string","string","string","string"],"correctOptionIndex":0}]}`;
};

// Shuffles each question's options and moves correctOptionIndex with them,
// so the right answer is not always in the same slot.
const shuffleOptions = (questions) =>
    questions
        .filter((q) => q?.question && Array.isArray(q.options) && q.options.length >= 2 && q.options[q.correctOptionIndex] != null)
        .map((q) => {
            const correct = q.options[q.correctOptionIndex];
            const options = [...q.options].sort(() => Math.random() - 0.5);
            return { question: q.question, options, correctOptionIndex: options.indexOf(correct) };
        });

const sanitizeQuiz = (quiz) => ({
    _id: quiz._id,
    topicId: quiz.topicId,
    questions: quiz.questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options
    }))
});

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

    // Every generate makes a fresh quiz; the previous one is passed in so it isn't repeated
    const [previous, roadmap] = await Promise.all([
        Quiz.findOne({ topicId }),
        Roadmap.findById(topic.roadmapId).select("subject")
    ]);
    const previousQuestions = (previous?.questions || []).map((q) => q.question);

    const prompt = buildQuizPrompt(topic.title, roadmap?.subject, previousQuestions);
    const aiResponse = await generateJsonFast(prompt, { temperature: 0.9 });

    const questions = shuffleOptions(Array.isArray(aiResponse?.questions) ? aiResponse.questions : []);
    if (questions.length === 0) {
        throw new ApiError(502, "AI response did not contain valid quiz questions");
    }

    const quiz = await Quiz.findOneAndUpdate(
        { topicId },
        { topicId, questions },
        { upsert: true, returnDocument: "after" }
    );

    // Strip correct answers before returning — client should not see them in network tab
    return res.status(201).json(new ApiResponse(201, sanitizeQuiz(quiz), "Quiz generated successfully"));
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
    return res.status(200).json(new ApiResponse(200, sanitizeQuiz(quiz), "Quiz fetched successfully"));
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
