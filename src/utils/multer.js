import multer from "multer";
import { ApiError } from "./ApiError.js";
import { detectFileKind } from "./resumeParser.js";

// Memory storage: files stay as a Buffer in req.file/req.files, never touch disk.
// Fine at this scale — we parse the text immediately and discard the buffer.
const storage = multer.memoryStorage();

// Checked by mimetype OR extension: a PDF can arrive as application/x-pdf or octet-stream
const fileFilter = (req, file, cb) => {
    if (detectFileKind(file)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, "Only PDF, DOCX and TXT files are allowed"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
