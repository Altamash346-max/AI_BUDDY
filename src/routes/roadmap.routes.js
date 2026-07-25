import { Router } from "express";
import {
    generateRoadmap,
    getMyRoadmaps,
    getRoadmapWithTopics
} from "../controllers/roadmap.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // every route below requires a logged-in user

router.route("/generate").post(generateRoadmap);
router.route("/me").get(getMyRoadmaps);
router.route("/:roadmapId").get(getRoadmapWithTopics);

export default router