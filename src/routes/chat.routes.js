import { Router } from "express";
import { chatWithBuddy } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(chatWithBuddy);

export default router;
