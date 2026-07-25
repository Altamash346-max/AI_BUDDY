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
import userRouter from "./routes/user.routes.js";
import roadmapRouter from "./routes/roadmap.routes.js";
app.use("/api/users", userRouter);
app.use("/api/roadmap", roadmapRouter);

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