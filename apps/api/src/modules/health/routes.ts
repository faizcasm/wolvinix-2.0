import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { health } from "./controller.js";

export const healthRouter = Router();

healthRouter.get("/", asyncHandler(health));
