import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import { addReview, deleteReview, listReviews } from "./controller.js";

const reviewParams = z.object({ id: objectIdSchema });

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating must be 1 to 5").max(5, "Rating must be 1 to 5"),
  message: z.string().trim().min(3, "Tell us a little more").max(1000),
});

export const reviewsRouter = Router();

// Public list, authenticated mutations.
reviewsRouter.get("/", validate({ query: passthroughQuery }), asyncHandler(listReviews));
reviewsRouter.post("/", protect, validate({ body: createReviewSchema }), asyncHandler(addReview));
reviewsRouter.delete(
  "/:id",
  protect,
  validate({ params: reviewParams }),
  asyncHandler(deleteReview),
);
