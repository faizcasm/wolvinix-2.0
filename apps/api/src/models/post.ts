import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

export const MAX_POST_LENGTH = 500;

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: MAX_POST_LENGTH, trim: true },
  },
  { timestamps: true },
);

const postSchema = new mongoose.Schema(
  {
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, maxlength: MAX_POST_LENGTH, trim: true },
    mediaUrl: { type: String, default: "" },
    mediaType: { type: String, enum: ["image", "video", "none"], default: "none" },
    mediaPublicId: { type: String, default: "" },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    hashtags: [{ type: String, index: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [replySchema],
  },
  { timestamps: true },
);

// Feed, hashtag, bookmark and explore queries.
postSchema.index({ postedBy: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ bookmarks: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });

export const POST_POPULATE = [
  { path: "postedBy", select: SAFE_USER_FIELDS },
  { path: "replies.user", select: SAFE_USER_FIELDS },
  { path: "tags", select: SAFE_USER_FIELDS },
];

export const Post: mongoose.Model<any> = mongoose.models.Post || mongoose.model("Post", postSchema);

export interface PostJson {
  _id: string;
  text: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "none";
  postedBy: SafeUser | { _id: string } | null;
  tags: Array<SafeUser | { _id: string }>;
  hashtags: string[];
  likes: string[];
  bookmarks: string[];
  replies: Array<{
    _id: string;
    user: SafeUser | { _id: string } | null;
    text: string;
    createdAt: string;
  }>;
  likesCount: number;
  repliesCount: number;
  bookmarksCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function toPostJson(post: unknown): PostJson {
  const raw = (
    typeof (post as { toObject?: unknown }).toObject === "function"
      ? (post as { toObject: () => Record<string, unknown> }).toObject()
      : post
  ) as Record<string, unknown>;

  const likes = Array.isArray(raw.likes) ? raw.likes : [];
  const bookmarks = Array.isArray(raw.bookmarks) ? raw.bookmarks : [];
  const replies = Array.isArray(raw.replies) ? raw.replies : [];
  const tags = Array.isArray(raw.tags) ? raw.tags : [];

  return {
    _id: toId(raw._id),
    text: String(raw.text ?? ""),
    mediaUrl: String(raw.mediaUrl ?? ""),
    mediaType: (["image", "video"].includes(String(raw.mediaType)) ? raw.mediaType : "none") as
      "image" | "video" | "none",
    postedBy: toSafeUser(raw.postedBy) ?? toUserRef(raw.postedBy),
    tags: tags.map((tag) => toSafeUser(tag) ?? toUserRef(tag)),
    hashtags: Array.isArray(raw.hashtags) ? (raw.hashtags as string[]) : [],
    likes: likes.map((like) => toId(like)),
    bookmarks: bookmarks.map((bookmark) => toId(bookmark)),
    replies: replies.map((reply) => {
      const record = reply as Record<string, unknown>;
      return {
        _id: toId(record._id),
        user: toSafeUser(record.user) ?? toUserRef(record.user),
        text: String(record.text ?? ""),
        createdAt: isoDate(record.createdAt ?? record.updatedAt),
      };
    }),
    likesCount: likes.length,
    repliesCount: replies.length,
    bookmarksCount: bookmarks.length,
    createdAt: isoDate(raw.createdAt),
    updatedAt: raw.updatedAt ? isoDate(raw.updatedAt) : undefined,
  };
}
