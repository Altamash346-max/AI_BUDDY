import { Router } from "express";
import { generateQuiz, getQuizForTopic, submitQuiz } from "../controllers/quiz.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/:topicId/generate").post(generateQuiz);
router.route("/:topicId").get(getQuizForTopic);
router.route("/:topicId/submit").post(submitQuiz);

export default router;