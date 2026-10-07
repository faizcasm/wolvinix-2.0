import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { objectIdSchema } from "../../lib/schemas.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import { createStory, deleteStory, listStories, toggleStoryLike, viewStory } from "./controller.js";

const storyParams = z.object({ id: objectIdSchema });

const createStorySchema = z.object({
  mediaUrl: z.string().trim().url("mediaUrl must be a valid URL").max(1000),
  mediaType: z.enum(["image", "video"]),
});

export const storiesRouter = Router();

storiesRouter.use(protect);

storiesRouter.get("/", asyncHandler(listStories));
storiesRouter.post("/", validate({ body: createStorySchema }), asyncHandler(createStory));
storiesRouter.post("/:id/view", validate({ params: storyParams }), asyncHandler(viewStory));
storiesRouter.put("/:id/like", validate({ params: storyParams }), asyncHandler(toggleStoryLike));
storiesRouter.delete("/:id", validate({ params: storyParams }), asyncHandler(deleteStory));
