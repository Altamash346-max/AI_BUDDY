import { Router } from "express";
import {
    signupUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/signup").post(signupUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// protected routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getCurrentUser);

export default router