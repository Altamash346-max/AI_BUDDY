import { Router } from "express";
import {
    generateStudyPlan,
    getStudyPlan,
    toggleTaskDone
} from "../controllers/studyPlanner.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/generate/:roadmapId").post(generateStudyPlan);
router.route("/:roadmapId").get(getStudyPlan);
router.route("/:roadmapId/task/:taskId/toggle").patch(toggleTaskDone);

export default router;
