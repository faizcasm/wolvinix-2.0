import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { protect } from "../../middleware/protect.js";
import { uploadMedia, uploadSingle } from "./controller.js";

export const mediaRouter = Router();

mediaRouter.post("/upload", protect, uploadSingle, asyncHandler(uploadMedia));
