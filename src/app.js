import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({ limit: "16kb" }));
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

app.use("/api/users", userRouter);
app.use("/api/roadmap", roadmapRouter);
app.use("/api/progress", progressRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/planner", plannerRouter);

app.get("/api/health", (_req, res) => {
    res.json({ status: "Server is alive" });
});

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
