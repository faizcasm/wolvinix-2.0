import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

export const NOTIFICATION_TYPES = [
  "like",
  "reply",
  "follow",
  "tag",
  "story",
  "clan",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, default: "", maxlength: 300 },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, seen: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const NOTIFICATION_POPULATE = [
  { path: "sender", select: SAFE_USER_FIELDS },
  { path: "recipient", select: SAFE_USER_FIELDS },
];

export const Notification: mongoose.Model<any> =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export interface NotificationJson {
  _id: string;
  recipient: SafeUser | { _id: string } | null;
  sender: SafeUser | { _id: string } | null;
  type: NotificationType;
  message: string;
  post: string;
  seen: boolean;
  createdAt: string;
}

export function toNotificationJson(notification: unknown): NotificationJson {
  const raw = (
    typeof (notification as { toObject?: unknown }).toObject === "function"
      ? (notification as { toObject: () => Record<string, unknown> }).toObject()
      : notification
  ) as Record<string, unknown>;

  return {
    _id: toId(raw._id),
    recipient: toSafeUser(raw.recipient) ?? toUserRef(raw.recipient),
    sender: toSafeUser(raw.sender) ?? toUserRef(raw.sender),
    type: (NOTIFICATION_TYPES.includes(raw.type as NotificationType)
      ? raw.type
      : "system") as NotificationType,
    message: String(raw.message ?? ""),
    post: toId(raw.post),
    seen: Boolean(raw.seen),
    createdAt: isoDate(raw.createdAt),
  };
}

export interface CreateNotificationInput {
  recipient: string;
  sender: string;
  type: NotificationType;
  message?: string;
  post?: string | null;
}
