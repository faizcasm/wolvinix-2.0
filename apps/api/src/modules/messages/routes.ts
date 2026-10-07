import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import {
  deleteConversation,
  ensureConversation,
  getConversation,
  listConversations,
  listMessages,
  sendMessage,
  unreadCount,
} from "./controller.js";
import {
  conversationParams,
  createConversationSchema,
  listQuery,
  sendMessageSchema,
} from "./schemas.js";

export const messagesRouter = Router();

messagesRouter.use(protect);

messagesRouter.get(
  "/conversations",
  validate({ query: listQuery }),
  asyncHandler(listConversations),
);
messagesRouter.post(
  "/conversations",
  validate({ body: createConversationSchema }),
  asyncHandler(ensureConversation),
);
messagesRouter.get(
  "/conversations/:id",
  validate({ params: conversationParams }),
  asyncHandler(getConversation),
);
messagesRouter.get(
  "/conversations/:id/messages",
  validate({ params: conversationParams, query: listQuery }),
  asyncHandler(listMessages),
);
messagesRouter.post(
  "/conversations/:id/messages",
  validate({ params: conversationParams, body: sendMessageSchema }),
  asyncHandler(sendMessage),
);
messagesRouter.delete(
  "/conversations/:id",
  validate({ params: conversationParams }),
  asyncHandler(deleteConversation),
);
messagesRouter.get("/unread-count", asyncHandler(unreadCount));
