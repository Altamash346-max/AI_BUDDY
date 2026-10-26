import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateJsonFromPrompt } from "../utils/geminiclient.js"; // FIX: was "geminiClient.js" (wrong case)
import { Roadmap } from "../models/roadmap.model.js";
import { Topic } from "../models/topic.model.js";
import { Quiz } from "../models/quiz.model.js";

const WEAK_SCORE = 60;

const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be)$/i;

// Gemini invents YouTube video IDs (only ~1 in 6 resolved in our link check), so any
// video or YouTube resource becomes a YouTube search for that title, which always works.
// Non-video URLs are kept if they parse as http(s); otherwise they fall back to a web search.
const cleanResources = (resources, subject, topicTitle) =>
    (Array.isArray(resources) ? resources : []).map((r) => {
        const title = (r?.title || topicTitle || "").toString().trim();
        let parsed = null;
        try {
            parsed = new URL(r?.url);
        } catch {
            parsed = null;
        }
        const isHttp = parsed && /^https?:$/.test(parsed.protocol);
        const query = encodeURIComponent(`${subject} ${title}`.trim());

        if (r?.type === "video" || (isHttp && YOUTUBE_HOST.test(parsed.hostname))) {
            return { ...r, title, type: "video", url: `https://www.youtube.com/results?search_query=${query}` };
        }
        if (!isHttp) {
            return { ...r, title, url: `https://www.google.com/search?q=${query}` };
        }
        return { ...r, title };
    });

const LINK_TIMEOUT_MS = 4000;

// Gemini also invents article/course paths (e.g. realpython.com/<made-up-slug>). Check each
// non-search link once, in parallel, and swap only clearly dead ones (404/410/DNS failure)
// for a Google search. 403/429/5xx are kept: those sites exist but block bots or hiccup.
const isDeadLink = async (url) => {
    const opts = { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 PlacementPrep link check" } };
    try {
        let r = await fetch(url, { ...opts, method: "HEAD", signal: AbortSignal.timeout(LINK_TIMEOUT_MS) });
        if (r.status === 405 || r.status === 501) {
            r = await fetch(url, { ...opts, method: "GET", signal: AbortSignal.timeout(LINK_TIMEOUT_MS) });
        }
        return r.status === 404 || r.status === 410;
    } catch (err) {
        // Timeouts are not proof a page is gone; DNS/connection failures are
        return err?.name !== "TimeoutError" && err?.name !== "AbortError";
    }
};

const verifyResources = async (topicDocs, subject) => {
    const checks = [];
    for (const t of topicDocs) {
        for (const r of t.resources) {
            if (/google\.com\/search|youtube\.com\/results/.test(r.url)) continue;
            checks.push(
                isDeadLink(r.url).then((dead) => {
                    if (dead) r.url = `https://www.google.com/search?q=${encodeURIComponent(`${subject} ${r.title}`)}`;
                })
            );
        }
    }
    await Promise.all(checks);
    return topicDocs;
};

const describeTopic = (t, i) =>
    `${i + 1}. ${t.title}${t.quizScore != null ? ` (quiz ${t.quizScore}%)` : ""}`;

const buildAdaptPrompt = (roadmap, completed, remaining, instruction) => {
    const weak = [...completed, ...remaining].filter(
        (t) => t.quizScore != null && t.quizScore < WEAK_SCORE
    );

    return `You are adjusting a student's personalized learning roadmap based on their progress.

Subject: ${roadmap.subject}
Goal: ${roadmap.goal}
Current level: ${roadmap.level}
Time available: ${roadmap.timeAvailable}

Completed topics (already learned — keep them, do not repeat them):
${completed.length ? completed.map(describeTopic).join("\n") : "none yet"}

Topics still remaining in the current plan:
${remaining.length ? remaining.map(describeTopic).join("\n") : "none"}

Weak topics (quiz score below ${WEAK_SCORE}%):
${weak.length ? weak.map((t) => `- ${t.title} (${t.quizScore}%)`).join("\n") : "none"}

Student's request: ${instruction ? `"${instruction}"` : "none — adapt based on progress and quiz scores only"}

Rewrite ONLY the remaining part of the roadmap:
- Never include a completed topic again as-is.
- For each weak topic, add one short revision or practice topic for it early in the list.
- Follow the student's request where it is reasonable for their goal.
- Keep between 3 and 10 remaining topics in a sensible learning order.
- Give each topic 2-3 well-known resources (official docs, popular courses or videos).

Return ONLY valid JSON in exactly this shape:
{
  "summary": "one or two sentences telling the student what changed and why",
  "topics": [
    { "title": "string", "resources": [ { "title": "string", "url": "string", "type": "video" } ] }
  ]
}

Valid values for "type" are: video, article, documentation, course, practice, project.`;
};

const buildRoadmapPrompt = ({ subject, goal, level, timeAvailable }) => {
    return `You are an expert learning mentor. Create a personalized learning roadmap.

Subject: ${subject}
Goal: ${goal}
Current level: ${level}
Time available: ${timeAvailable}

Generate 8-10 topics in logical learning order. For each topic include 2-3 well-known resources (official docs, popular courses or videos). Keep titles short.

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
        resources: cleanResources(t.resources, subject, t.title)
    }));

    const topics = await Topic.insertMany(await verifyResources(topicDocs, subject));

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

    // Cleaned on read too, so roadmaps saved before link cleaning also get working links
    const topics = (await Topic.find({ roadmapId: roadmap._id }).sort({ order: 1 }).lean()).map((t) => ({
        ...t,
        resources: cleanResources(t.resources, roadmap.subject, t.title)
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, { roadmap, topics }, "Roadmap fetched successfully"));
});

// DELETE /api/roadmap/:roadmapId
const deleteRoadmap = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    // Cascade delete all topics belonging to this roadmap
    await Topic.deleteMany({ roadmapId: roadmap._id });
    await Roadmap.deleteOne({ _id: roadmap._id });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Roadmap deleted successfully"));
});

// POST /api/roadmap/:roadmapId/adapt  { instruction?: string }
// Keeps completed topics and asks Gemini to rebuild the rest from progress,
// quiz scores and the student's optional request.
const adaptRoadmap = asyncHandler(async (req, res) => {
    const { roadmapId } = req.params;
    const instruction = (req.body?.instruction || "").toString().trim();

    if (instruction.length > 300) {
        throw new ApiError(400, "instruction must be 300 characters or fewer");
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) {
        throw new ApiError(404, "Roadmap not found");
    }

    const allTopics = await Topic.find({ roadmapId }).sort({ order: 1 });
    const completed = allTopics.filter((t) => t.status === "completed");
    const remaining = allTopics.filter((t) => t.status !== "completed");

    const aiResponse = await generateJsonFromPrompt(
        buildAdaptPrompt(roadmap, completed, remaining, instruction)
    );

    if (!Array.isArray(aiResponse?.topics) || aiResponse.topics.length === 0) {
        throw new ApiError(502, "AI response did not contain a valid topics list");
    }

    const summary = (aiResponse.summary || "Roadmap updated based on your progress.").toString().slice(0, 500);

    // Renumber completed topics 1..n so the new ones follow them in order
    await Promise.all(
        completed.map((t, i) => Topic.updateOne({ _id: t._id }, { order: i + 1 }))
    );

    // Replace the unfinished part of the plan (and quizzes tied to it)
    const removedIds = remaining.map((t) => t._id);
    await Promise.all([
        Topic.deleteMany({ _id: { $in: removedIds } }),
        Quiz.deleteMany({ topicId: { $in: removedIds } }),
    ]);

    await Topic.insertMany(
        await verifyResources(
            aiResponse.topics.slice(0, 10).map((t, i) => ({
                roadmapId: roadmap._id,
                title: t.title,
                order: completed.length + i + 1,
                status: i === 0 ? "current" : "locked",
                resources: cleanResources(t.resources, roadmap.subject, t.title),
            })),
            roadmap.subject
        )
    );

    roadmap.adaptations.push({ instruction, summary });
    await roadmap.save();

    const topics = await Topic.find({ roadmapId }).sort({ order: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, { roadmap, topics, summary }, "Roadmap adapted successfully"));
});

export { generateRoadmap, getMyRoadmaps, getRoadmapWithTopics, deleteRoadmap, adaptRoadmap };
