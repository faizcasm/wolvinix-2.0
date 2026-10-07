import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", maxlength: 2000, trim: true },
    imageUrl: { type: String, default: "" },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, seen: 1, sender: 1 });

export const Message: mongoose.Model<any> =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export interface MessageJson {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  imageUrl: string;
  seen: boolean;
  createdAt: string;
}

export function toMessageJson(message: unknown): MessageJson {
  const raw = (
    typeof (message as { toObject?: unknown }).toObject === "function"
      ? (message as { toObject: () => Record<string, unknown> }).toObject()
      : message
  ) as Record<string, unknown>;

  return {
    _id: toId(raw._id),
    conversationId: toId(raw.conversationId),
    sender: toId(raw.sender),
    text: String(raw.text ?? ""),
    imageUrl: String(raw.imageUrl ?? ""),
    seen: Boolean(raw.seen),
    createdAt: isoDate(raw.createdAt),
  };
}
