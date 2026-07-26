import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "./ApiError.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Strips ```json fences some models add even when told not to
const cleanJsonText = (text) => {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * Sends a prompt to Gemini and parses the response as JSON.
 * Retries once with a stricter instruction if the first response
 * isn't valid JSON — this is the single most fragile part of the
 * whole pipeline, so don't remove the retry.
 */
export const generateJsonFromPrompt = async (prompt) => {
    const attempt = async (finalPrompt) => {
        const result = await model.generateContent(finalPrompt);
        const text = result.response.text();
        return JSON.parse(cleanJsonText(text));
    };

    try {
        return await attempt(prompt);
    } catch (firstError) {
        try {
            const strictPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No explanation, no markdown, no code fences.`;
            return await attempt(strictPrompt);
        } catch (secondError) {
            console.error("Gemini Error", secondError);
            throw new ApiError(502, "AI did not return valid JSON. Please try again.");
        }
    }
};