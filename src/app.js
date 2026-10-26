import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Behind Render's (or any) HTTPS proxy, so req.secure and secure cookies work
app.set("trust proxy", 1);

// CORS_ORIGIN=* breaks credentials (cookies) — browsers reject it.
// Allow the Vite dev origin explicitly, or use the env var if it's a real URL.
const allowedOrigin =
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
        ? process.env.CORS_ORIGIN
        : 'http://localhost:5173';

app.use(cors({
    origin: allowedOrigin,
    credentials: true
}));
// 64kb leaves room for chatbot history (16 messages of up to 2000 chars)
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
// Routes
// FIX: was "./routes/user.routes.js" (lowercase) but the real file is "User.routes.js"
// (capital U) — works on Windows, breaks on Linux/Mac. Fixed to match the real filename.
import userRouter from "./routes/User.routes.js";
import roadmapRouter from "./routes/roadmap.routes.js";
import progressRouter from "./routes/progress.routes.js";
import quizRouter from "./routes/quiz.routes.js";
import interviewRouter from "./routes/interview.routes.js";
import plannerRouter from "./routes/studyPlanner.routes.js";
import chatRouter from "./routes/chat.routes.js";

app.use("/api/users", userRouter);
app.use("/api/roadmap", roadmapRouter);
app.use("/api/progress", progressRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/planner", plannerRouter);
app.use("/api/chat", chatRouter);

app.get("/api/health", (_req, res) => {
    res.json({ status: "Server is alive" });
});

// In production the built React app (frontend/dist) is served from the same
// origin as the API, so cookies and relative /api calls work without CORS.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/dist");
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // Any non-API GET falls back to index.html so React Router can handle it
    app.get(/^\/(?!api\/).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, "index.html"));
    });
}

// Central error handler — catches every ApiError thrown via asyncHandler
app.use((err, _req, res, _next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors
        });
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

export { app };
