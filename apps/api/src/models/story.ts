import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    mediaPublicId: { type: String, default: "" },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // TTL: documents disappear ~24h after `expiresAt`.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + STORY_TTL_MS),
      index: { expiresAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

storySchema.index({ user: 1, createdAt: -1 });

export const STORY_POPULATE = [
  { path: "user", select: SAFE_USER_FIELDS },
  { path: "viewers", select: SAFE_USER_FIELDS },
];

export const Story: mongoose.Model<any> =
  mongoose.models.Story || mongoose.model("Story", storySchema);

export interface StoryJson {
  _id: string;
  user: SafeUser | { _id: string } | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  viewers: SafeUser[];
  likes: string[];
  seenByMe: boolean;
  likesCount: number;
  createdAt: string;
  expiresAt: string;
}

export function toStoryJson(story: unknown, viewerId?: string | null): StoryJson {
  const raw = (
    typeof (story as { toObject?: unknown }).toObject === "function"
      ? (story as { toObject: () => Record<string, unknown> }).toObject()
      : story
  ) as Record<string, unknown>;

  const viewers = Array.isArray(raw.viewers) ? raw.viewers : [];
  const likes = Array.isArray(raw.likes) ? raw.likes : [];
  const viewerIds = viewers.map((entry) => toId(entry));

  return {
    _id: toId(raw._id),
    user: toSafeUser(raw.user) ?? toUserRef(raw.user),
    mediaUrl: String(raw.mediaUrl ?? ""),
    mediaType: raw.mediaType === "video" ? "video" : "image",
    viewers: viewers
      .map((entry) => toSafeUser(entry))
      .filter((entry): entry is SafeUser => Boolean(entry)),
    likes: likes.map((like) => toId(like)),
    seenByMe: viewerId ? viewerIds.includes(String(viewerId)) : false,
    likesCount: likes.length,
    createdAt: isoDate(raw.createdAt),
    expiresAt: isoDate(raw.expiresAt),
  };
}
