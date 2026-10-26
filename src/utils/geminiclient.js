import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "./ApiError.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model priority list — gemini-3.5-flash-lite is stable and fast on free tier.
// The heavier flash models frequently 503/429 and cause long retry delays.
const MODEL_PRIORITY = [
    "gemini-3.5-flash-lite",  // ✅ fast, stable, free-tier friendly
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
];

// Strips ```json fences some models add even when told not to
const cleanJsonText = (text) => {
    return text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
};

/**
 * Sends a prompt to Gemini and parses the response as JSON.
 * - Tries MODEL_PRIORITY list in order; on overload (503/429) moves straight
 *   to the next model instead of sleeping on the busy one.
 * - Forces JSON MIME type so the model cannot return free text.
 * - If the output was cut off by the token limit, retries once with double
 *   the budget (re-prompting would just get truncated again).
 */
export const generateJsonFromPrompt = async (prompt, options = {}) => {
    const strictPrompt = `${prompt}

IMPORTANT: Your ENTIRE response must be ONLY valid JSON. No explanation, no markdown, no code fences, no text before or after the JSON.`;

    // Newer flash models spend part of this budget on internal "thinking",
    // so it must be well above the size of the JSON we expect back.
    let maxTokens = options.maxOutputTokens ?? 8192;
    const timeout = options.timeoutMs ?? 60000;

    for (const modelName of MODEL_PRIORITY) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            const model = genAI.getGenerativeModel(
                {
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.3,
                        maxOutputTokens: maxTokens,
                    },
                },
                { timeout }
            );

            let finishReason;
            try {
                const result = await model.generateContent(
                    attempt === 1 ? prompt : strictPrompt
                );
                finishReason = result.response.candidates?.[0]?.finishReason;
                const parsed = JSON.parse(cleanJsonText(result.response.text()));
                console.log(`✅ Gemini success: model=${modelName}, attempt=${attempt}`);
                return parsed;
            } catch (err) {
                const msg = err.message || "";
                const isOverloaded = /503|429|high demand|Service Unavailable|quota|rate limit|overloaded/i.test(msg);
                const isModelGone = /404|no longer available|not found/i.test(msg);
                const isParseErr = err instanceof SyntaxError;

                if (isModelGone) {
                    console.warn(`⚠️  Model ${modelName} unavailable (404), trying next...`);
                    break;
                }
                if (isOverloaded) {
                    console.warn(`⚠️  ${modelName} is overloaded, trying next model...`);
                    break;
                }
                if (isParseErr && attempt === 1) {
                    if (finishReason === "MAX_TOKENS") {
                        maxTokens *= 2;
                        console.warn(`⚠️  ${modelName} output truncated, retrying with ${maxTokens} tokens...`);
                    } else {
                        console.warn(`⚠️  ${modelName} returned non-JSON (${finishReason}), retrying with strict prompt...`);
                    }
                    continue;
                }

                console.error(`❌ ${modelName} attempt ${attempt} failed:`, msg.slice(0, 200));
                break;
            }
        }
    }

    // All models exhausted
    throw new ApiError(502, "AI service is currently unavailable. Please try again in a few seconds.");
};

/**
 * Multi-turn plain-text reply for the doubt-solving chatbot.
 * `history` is [{ role: "user" | "model", text }], oldest first, ending with the user's turn.
 * Same model fallback as above; a reply cut off by the token limit is retried with more room.
 */
export const generateChatReply = async (history, systemInstruction) => {
    const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

    for (const modelName of MODEL_PRIORITY) {
        let maxTokens = 4096;
        for (let attempt = 1; attempt <= 2; attempt++) {
            const model = genAI.getGenerativeModel(
                {
                    model: modelName,
                    systemInstruction,
                    generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens },
                },
                { timeout: 45000 }
            );
            try {
                const result = await model.generateContent({ contents });
                const finishReason = result.response.candidates?.[0]?.finishReason;
                const text = result.response.text().trim();
                if (finishReason === "MAX_TOKENS" && attempt === 1) {
                    maxTokens *= 2;
                    continue;
                }
                if (text) return text;
                break;
            } catch (err) {
                const msg = err.message || "";
                console.warn(`⚠️  chat: ${modelName} failed (${msg.slice(0, 120)}), trying next...`);
                break;
            }
        }
    }

    throw new ApiError(502, "AI Buddy is busy right now. Please try again in a few seconds.");
};

/**
 * Variant for small JSON outputs (quizzes, short lists) with a shorter timeout.
 */
export const generateJsonFast = (prompt) =>
    generateJsonFromPrompt(prompt, { maxOutputTokens: 4096, timeoutMs: 30000 });