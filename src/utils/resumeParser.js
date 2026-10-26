import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extracts raw text from an uploaded resume/LinkedIn PDF or DOCX buffer.
 * Throws a plain Error on unsupported types — callers should wrap in try/catch
 * or let asyncHandler pass it to the central error handler.
 */
export const extractTextFromBuffer = async (buffer, mimetype) => {
    if (mimetype === "application/pdf") {
        // pdf-parse v2 exposes a class instead of the v1 function
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    throw new Error("Unsupported file type for text extraction");
};