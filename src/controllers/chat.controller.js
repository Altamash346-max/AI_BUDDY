import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateChatReply } from "../utils/geminiclient.js";
import { Roadmap } from "../models/roadmap.model.js";
import { Topic } from "../models/topic.model.js";

const MAX_MESSAGES = 16;
const MAX_CHARS = 2000;

// Short summary of what the student is studying, so answers fit their plan
const buildStudentContext = async (userId, topicId) => {
    const roadmaps = await Roadmap.find({ userId }).limit(5);
    const lines = [];

    for (const rm of roadmaps) {
        const topics = await Topic.find({ roadmapId: rm._id }).sort({ order: 1 });
        const current = topics.find((t) => t.status === "current");
        const weak = topics.filter((t) => t.quizScore != null && t.quizScore < 60).map((t) => t.title);
        lines.push(
            `- ${rm.subject} (${rm.level}, goal: ${rm.goal}): ${topics.filter((t) => t.status === "completed").length}/${topics.length} topics done` +
            (current ? `, currently on "${current.title}"` : "") +
            (weak.length ? `, weak quiz topics: ${weak.join(", ")}` : "")
        );
    }

    let focus = "";
    if (topicId) {
        const topic = await Topic.findById(topicId);
        const owner = topic && (await Roadmap.findOne({ _id: topic.roadmapId, userId }));
        if (owner) focus = `\nThe student opened this chat from the topic "${topic.title}" in their ${owner.subject} roadmap.`;
    }

    return (lines.length ? `The student's roadmaps:\n${lines.join("\n")}` : "The student has no roadmap yet.") + focus;
};

// POST /api/chat  { messages: [{ role: "user" | "assistant", content }], topicId? }
const chatWithBuddy = asyncHandler(async (req, res) => {
    const { messages, topicId } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
        throw new ApiError(400, "messages must be a non-empty array");
    }

    const history = messages
        .slice(-MAX_MESSAGES)
        .filter((m) => m && typeof m.content === "string" && m.content.trim())
        .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            text: m.content.trim().slice(0, MAX_CHARS),
        }));

    // Gemini requires the conversation to start with a user turn and end with one
    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length || history[history.length - 1].role !== "user") {
        throw new ApiError(400, "The last message must be from the user");
    }

    const context = await buildStudentContext(req.user._id, topicId);

    const systemInstruction = `You are AI Buddy, a friendly study mentor inside a placement-preparation app for engineering students.
Help the student clear doubts about programming, computer science subjects, aptitude, interviews and their study plan.
- Explain step by step in simple language; use a small example or short code snippet when it helps.
- Keep answers focused: usually under 250 words unless the student asks for more detail.
- Use plain text with short paragraphs, "- " bullets and \`\`\` code blocks; no tables or headings.
- If you are not sure about something, say so instead of guessing.
- If the question has nothing to do with studies or careers, answer briefly and steer back to their preparation.

${context}`;

    const reply = await generateChatReply(history, systemInstruction);

    return res.status(200).json(new ApiResponse(200, { reply }, "Reply generated"));
});

export { chatWithBuddy };
