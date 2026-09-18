import { Router } from "express";
import { uploadResume, getMyProfile } from "../controllers/candidateProfile.controller.js";
import {
    generateInterviewPrep,
    getMyInterviewPreps,
    getInterviewPrepById
} from "../controllers/interviewPrep.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../utils/multer.js";

const router = Router();

router.use(verifyJWT);

// Resume / LinkedIn upload + parsing
router.route("/profile/upload").post(
    upload.fields([
        { name: "resume", maxCount: 1 },
        { name: "linkedin", maxCount: 1 }
    ]),
    uploadResume
);
router.route("/profile").get(getMyProfile);

// Interview question generation
// NOTE: these literal routes are registered before "/:id" on purpose —
// Express matches in registration order, so "/generate" and "/me" must come first
// or they'd get swallowed by the "/:id" param route.
router.route("/generate").post(generateInterviewPrep);
router.route("/me").get(getMyInterviewPreps);
router.route("/:id").get(getInterviewPrepById);

export default router;
