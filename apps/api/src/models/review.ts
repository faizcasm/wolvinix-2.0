import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

export const MAX_REVIEWS_PER_USER = 2;

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

export const REVIEW_POPULATE = { path: "user", select: SAFE_USER_FIELDS };

export const Review: mongoose.Model<any> =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

export interface ReviewJson {
  _id: string;
  user: SafeUser | { _id: string } | null;
  rating: number;
  message: string;
  createdAt: string;
}

export function toReviewJson(review: unknown): ReviewJson {
  const raw = (
    typeof (review as { toObject?: unknown }).toObject === "function"
      ? (review as { toObject: () => Record<string, unknown> }).toObject()
      : review
  ) as Record<string, unknown>;

  return {
    _id: toId(raw._id),
    user: toSafeUser(raw.user) ?? toUserRef(raw.user),
    rating: Number(raw.rating ?? 0),
    message: String(raw.message ?? ""),
    createdAt: isoDate(raw.createdAt),
  };
}
