import { createRequire } from "module";
import mammoth from "mammoth";

// pdf-parse is CommonJS and doesn't play nicely with `import pdfParse from "pdf-parse"`
// under "type": "module" — Node throws "does not provide an export named 'default'".
// Using createRequire sidesteps the broken interop entirely.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

/**
 * Extracts raw text from an uploaded resume/LinkedIn PDF or DOCX buffer.
 * Throws a plain Error on unsupported types — callers should wrap in try/catch
 * or let asyncHandler pass it to the central error handler.
 */
export const extractTextFromBuffer = async (buffer, mimetype) => {
    if (mimetype === "application/pdf") {
        const data = await pdfParse(buffer);
        return data.text;
    }

    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    throw new Error("Unsupported file type for text extraction");
};