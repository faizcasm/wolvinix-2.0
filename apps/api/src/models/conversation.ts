import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      imageUrl: { type: String, default: "" },
      seen: { type: Boolean, default: false },
      at: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const CONVERSATION_POPULATE = { path: "participants", select: SAFE_USER_FIELDS };

export const Conversation: mongoose.Model<any> =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export interface ConversationJson {
  _id: string;
  participants: SafeUser[];
  otherUser: SafeUser | null;
  lastMessage: { text: string; sender: string; imageUrl: string; seen: boolean; at: string } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serializes a conversation for `currentUserId`: `otherUser` is the peer of a
 * 1:1 chat, `unreadCount` comes from the caller (computed with an aggregate).
 */
export function toConversationJson(
  conversation: unknown,
  currentUserId: string,
  unreadCount = 0,
): ConversationJson {
  const raw = (
    typeof (conversation as { toObject?: unknown }).toObject === "function"
      ? (conversation as { toObject: () => Record<string, unknown> }).toObject()
      : conversation
  ) as Record<string, unknown>;

  const participants = (Array.isArray(raw.participants) ? raw.participants : [])
    .map((entry) => toSafeUser(entry))
    .filter((entry): entry is SafeUser => Boolean(entry));

  const otherUser = participants.find((entry) => entry._id !== String(currentUserId)) ?? null;
  const last = raw.lastMessage as Record<string, unknown> | undefined | null;

  return {
    _id: toId(raw._id),
    participants,
    otherUser: otherUser ?? participants[0] ?? null,
    lastMessage: last
      ? {
          text: String(last.text ?? ""),
          sender: toId(last.sender),
          imageUrl: String(last.imageUrl ?? ""),
          seen: Boolean(last.seen),
          at: isoDate(last.at ?? raw.updatedAt),
        }
      : null,
    unreadCount,
    createdAt: isoDate(raw.createdAt),
    updatedAt: isoDate(raw.updatedAt ?? raw.createdAt),
  };
}

export function toUserRefList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => toId(entry)).filter(Boolean) : [];
}

export { toUserRef };
