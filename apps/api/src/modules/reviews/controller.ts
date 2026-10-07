import type { Request, Response } from "express";
import { ApiError } from "../../lib/errors.js";
import { parsePagination } from "../../lib/pagination.js";
import { created, ok, paginated } from "../../lib/response.js";
import {
  MAX_REVIEWS_PER_USER,
  REVIEW_POPULATE,
  Review,
  toReviewJson,
} from "../../models/review.js";

export async function listReviews(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);

  const [total, reviews] = await Promise.all([
    Review.countDocuments({}),
    Review.find().populate(REVIEW_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  paginated(
    res,
    reviews.map((review) => toReviewJson(review)),
    total,
    page,
    limit,
  );
}

export async function addReview(req: Request, res: Response): Promise<void> {
  const { rating, message } = req.body as { rating: number; message: string };
  const meId = req.user._id;

  const existing = await Review.countDocuments({ user: meId });
  if (existing >= MAX_REVIEWS_PER_USER) {
    throw ApiError.conflict(`You can only submit ${MAX_REVIEWS_PER_USER} reviews`);
  }

  const review = await Review.create({ user: meId, rating, message });
  await review.populate(REVIEW_POPULATE);

  created(res, toReviewJson(review));
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  const deleted = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) {
    const exists = await Review.exists({ _id: req.params.id });
    if (exists) throw ApiError.forbidden("You can only delete your own reviews");
    throw ApiError.notFound("Review not found");
  }

  ok(res, { ok: true });
}
