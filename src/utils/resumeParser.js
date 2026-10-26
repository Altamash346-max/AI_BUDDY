import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Works out the real kind of an uploaded file. Browsers and OSes don't always agree on
 * the mimetype (a PDF can arrive as application/x-pdf or application/octet-stream),
 * so the file extension is checked too.
 */
export const detectFileKind = (file) => {
    const name = (file?.originalname || "").toLowerCase();
    const type = file?.mimetype || "";
    if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
    if (type === DOCX_MIME || name.endsWith(".docx")) return "docx";
    if (type === "text/plain" || name.endsWith(".txt")) return "txt";
    return null;
};

/**
 * Extracts raw text from an uploaded resume/LinkedIn PDF, DOCX or TXT file.
 * Returns "" when nothing readable comes out (e.g. a scanned or unusual PDF), so the
 * caller can fall back to sending the PDF itself to Gemini.
 */
export const extractTextFromFile = async (file) => {
    const kind = detectFileKind(file);
    try {
        if (kind === "pdf") {
            // pdf-parse v2 exposes a class instead of the v1 function
            const parser = new PDFParse({ data: file.buffer });
            try {
                const result = await parser.getText();
                return result.text || "";
            } finally {
                await parser.destroy();
            }
        }
        if (kind === "docx") {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value || "";
        }
        if (kind === "txt") {
            return file.buffer.toString("utf8");
        }
    } catch (err) {
        console.warn(`⚠️  Text extraction failed for ${file.originalname}: ${err.message}`);
    }
    return "";
};
