import { Router } from "express";
import {
    generateRoadmap,
    getMyRoadmaps,
    getRoadmapWithTopics,
    deleteRoadmap,
    adaptRoadmap
} from "../controllers/roadmap.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // every route below requires a logged-in user

router.route("/generate").post(generateRoadmap);
router.route("/me").get(getMyRoadmaps);
router.route("/:roadmapId").get(getRoadmapWithTopics).delete(deleteRoadmap);
router.route("/:roadmapId/adapt").post(adaptRoadmap);

export default router