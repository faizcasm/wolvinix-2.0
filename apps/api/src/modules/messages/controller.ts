import type { Request, Response } from "express";
import { ApiError } from "../../lib/errors.js";
import { parsePagination } from "../../lib/pagination.js";
import { created, ok, paginated } from "../../lib/response.js";
import {
  CONVERSATION_POPULATE,
  Conversation,
  toConversationJson,
} from "../../models/conversation.js";
import { Message, toMessageJson } from "../../models/message.js";
import { SAFE_USER_FIELDS, User } from "../../models/user.js";
import { emitToConversation } from "../../sockets/index.js";
import type { SendMessageInput } from "./schemas.js";

/** Unseen messages NOT written by `meId`, keyed by conversation id. */
async function unreadCounts(
  meId: unknown,
  conversationIds: unknown[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!conversationIds.length) return counts;

  const rows: Array<{ _id: unknown; count: number }> = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: conversationIds },
        seen: false,
        sender: { $ne: meId },
      },
    },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);

  for (const row of rows) counts.set(String(row._id), row.count);
  return counts;
}

async function findConversation(conversationId: string, meId: unknown) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: meId,
  }).populate(CONVERSATION_POPULATE);
  if (!conversation) throw ApiError.notFound("Conversation not found");
  return conversation;
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const { page, limit, skip } = parsePagination(req);

  const [total, conversations] = await Promise.all([
    Conversation.countDocuments({ participants: meId }),
    Conversation.find({ participants: meId })
      .populate(CONVERSATION_POPULATE)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const counts = await unreadCounts(
    meId,
    conversations.map((conversation) => conversation._id),
  );

  paginated(
    res,
    conversations.map((conversation) =>
      toConversationJson(conversation, String(meId), counts.get(String(conversation._id)) ?? 0),
    ),
    total,
    page,
    limit,
  );
}

/** Find-or-create the 1:1 conversation with another user. */
export async function ensureConversation(req: Request, res: Response): Promise<void> {
  const meId = String(req.user._id);
  const { userId } = req.body as { userId: string };

  if (userId === meId) throw ApiError.validation("You cannot start a conversation with yourself");

  const other = await User.findById(userId).select(SAFE_USER_FIELDS);
  if (!other) throw ApiError.notFound("User not found");

  const existing = await Conversation.findOne({
    participants: { $all: [meId, userId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  }).populate(CONVERSATION_POPULATE);

  if (existing) {
    const counts = await unreadCounts(meId, [existing._id]);
    created(res, toConversationJson(existing, meId, counts.get(String(existing._id)) ?? 0));
    return;
  }

  const conversation = await Conversation.create({ participants: [meId, userId] });
  await conversation.populate(CONVERSATION_POPULATE);
  created(res, toConversationJson(conversation, meId));
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const conversation = await findConversation(req.params.id, meId);
  const counts = await unreadCounts(meId, [conversation._id]);
  ok(
    res,
    toConversationJson(conversation, String(meId), counts.get(String(conversation._id)) ?? 0),
  );
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const conversation = await findConversation(req.params.id, meId);
  const { page, limit, skip } = parsePagination(req);

  const [total, messages] = await Promise.all([
    Message.countDocuments({ conversationId: conversation._id }),
    Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
  ]);

  // Reading the thread marks the peer's messages as seen (idempotent).
  await Message.updateMany(
    { conversationId: conversation._id, sender: { $ne: meId }, seen: false },
    { $set: { seen: true } },
  );
  await Conversation.updateOne(
    { _id: conversation._id, "lastMessage.sender": { $ne: meId } },
    { $set: { "lastMessage.seen": true } },
  );
  emitToConversation(String(conversation._id), "message:seen", {
    conversationId: String(conversation._id),
    userId: String(meId),
    at: new Date().toISOString(),
  });

  paginated(
    res,
    messages.map((message) => toMessageJson(message)),
    total,
    page,
    limit,
  );
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const meId = String(req.user._id);
  const { text, imageUrl } = req.body as SendMessageInput;
  const conversation = await findConversation(req.params.id, meId);

  const message = await Message.create({
    conversationId: conversation._id,
    sender: meId,
    text: text ?? "",
    imageUrl: imageUrl ?? "",
    seen: false,
  });

  conversation.lastMessage = {
    text: text ?? "",
    sender: meId,
    imageUrl: imageUrl ?? "",
    seen: false,
    at: new Date(),
  };
  await conversation.save();

  emitToConversation(String(conversation._id), "message:new", {
    conversationId: String(conversation._id),
    message: toMessageJson(message),
  });

  created(res, toMessageJson(message));
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const conversation = await findConversation(req.params.id, meId);

  await Message.deleteMany({ conversationId: conversation._id });
  await Conversation.deleteOne({ _id: conversation._id });

  ok(res, { ok: true });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const conversations = await Conversation.find({ participants: meId }).select("_id").lean();
  const counts = await unreadCounts(
    meId,
    conversations.map((conversation) => conversation._id),
  );

  let total = 0;
  for (const value of counts.values()) total += value;
  ok(res, { count: total });
}
