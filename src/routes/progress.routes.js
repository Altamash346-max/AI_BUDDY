import { Router } from "express";
import {
    markTopicComplete,
    getProgressForRoadmap,
    getMyProgressStats
} from "../controllers/progress.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/complete").post(markTopicComplete);
router.route("/roadmap/:roadmapId").get(getProgressForRoadmap);
router.route("/stats").get(getMyProgressStats);

export default router;
