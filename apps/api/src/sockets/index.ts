import type { Server as HttpServer } from "node:http";
import mongoose from "mongoose";
import { Server, type Socket } from "socket.io";
import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { Conversation } from "../models/conversation.js";
import { Message, toMessageJson } from "../models/message.js";
import { Notification } from "../models/notification.js";
import { verifyTicket } from "../modules/auth/ticket.js";

export interface SocketInitOptions {
  /** Explicit allowed origins (CORS), credentials enabled. */
  origins: string[];
  /** JWT secret used to sign/verify handshake tickets. */
  secret: string;
}

let io: Server | null = null;

/** userId -> socket ids (online presence). */
const socketsByUser = new Map<string, Set<string>>();
/** `conversation:<id>` -> userIds currently in the room. */
const roomMembers = new Map<string, Set<string>>();

const USER_ROOM_PREFIX = "user:";
const CONVERSATION_ROOM_PREFIX = "conversation:";

export function conversationRoom(conversationId: unknown): string {
  return `${CONVERSATION_ROOM_PREFIX}${conversationId}`;
}

export function userRoom(userId: unknown): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}

export function getIO(): Server | null {
  return io;
}

export function isOnline(userId: unknown): boolean {
  return (socketsByUser.get(String(userId))?.size ?? 0) > 0;
}

export function onlineUserIds(): string[] {
  return [...socketsByUser.keys()];
}

/** Emits to every socket of one user (`user:<id>` room). */
export function emitToUser(userId: unknown, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/** Emits to every member of a conversation room. */
export function emitToConversation(conversationId: unknown, event: string, payload: unknown): void {
  io?.to(conversationRoom(conversationId)).emit(event, payload);
}

function trackSocket(userId: string, socketId: string): void {
  const existing = socketsByUser.get(userId) ?? new Set<string>();
  existing.add(socketId);
  socketsByUser.set(userId, existing);
}

function untrackSocket(userId: string, socketId: string): void {
  const existing = socketsByUser.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (existing.size === 0) socketsByUser.delete(userId);
}

function addRoomMember(room: string, userId: string): void {
  const members = roomMembers.get(room) ?? new Set<string>();
  members.add(userId);
  roomMembers.set(room, members);
}

function removeRoomMember(room: string, userId: string): void {
  const members = roomMembers.get(room);
  if (!members) return;
  members.delete(userId);
  if (members.size === 0) roomMembers.delete(room);
}

/** Room-scoped presence: only the ids of people online *in this room*. */
function broadcastPresence(room: string): void {
  const members = roomMembers.get(room);
  io?.to(room).emit("presence:update", { userIds: members ? [...members] : [] });
}

function socketError(socket: Socket, error: unknown): void {
  const apiError = error instanceof ApiError ? error : null;
  if (!apiError) logger.error({ err: error, socketId: socket.id }, "socket handler failed");
  const code = apiError?.code ?? "INTERNAL";
  const message = apiError && apiError.expose ? apiError.message : "Something went wrong";
  socket.emit("error", { code, message });
}

async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(conversationId)) return false;
  const conversation = await Conversation.findOne({ _id: conversationId, participants: userId })
    .select("_id")
    .lean();
  return Boolean(conversation);
}

interface EmitAck {
  (response: Record<string, unknown>): void;
}

async function handleMessageSend(socket: Socket, payload: any, ack?: EmitAck): Promise<void> {
  const userId = String(socket.data.userId);
  try {
    const conversationId = String(payload?.conversationId ?? "");
    if (!(await isParticipant(conversationId, userId))) {
      throw ApiError.forbidden("You are not a participant of this conversation");
    }

    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    const imageUrl = typeof payload?.imageUrl === "string" ? payload.imageUrl : "";
    if (!text && !imageUrl) throw ApiError.validation("A message needs text or an image");

    const message = await Message.create({
      conversationId,
      sender: userId,
      text,
      imageUrl,
      seen: false,
    });
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { lastMessage: { text, sender: userId, imageUrl, seen: false, at: new Date() } } },
    );

    const json = toMessageJson(message);
    io?.to(conversationRoom(conversationId)).emit("message:new", { conversationId, message: json });
    ack?.({ success: true, message: json });
  } catch (error) {
    socketError(socket, error);
    ack?.({ success: false });
  }
}

async function handleMessageSeen(socket: Socket, payload: any, ack?: EmitAck): Promise<void> {
  const userId = String(socket.data.userId);
  try {
    const conversationId = String(payload?.conversationId ?? "");
    if (!(await isParticipant(conversationId, userId))) {
      throw ApiError.forbidden("You are not a participant of this conversation");
    }

    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, seen: false },
      { $set: { seen: true } },
    );
    await Conversation.updateOne(
      { _id: conversationId, "lastMessage.sender": { $ne: userId } },
      { $set: { "lastMessage.seen": true } },
    );

    const at = new Date().toISOString();
    io?.to(conversationRoom(conversationId)).emit("message:seen", { conversationId, userId, at });
    ack?.({ success: true });
  } catch (error) {
    socketError(socket, error);
    ack?.({ success: false });
  }
}

function handleTyping(socket: Socket, payload: any, typing: boolean): void {
  const userId = String(socket.data.userId);
  const conversationId = String(payload?.conversationId ?? "");
  const room = conversationRoom(conversationId);

  // Room membership is established during the handshake — never trust the payload.
  if (!conversationId || !socket.rooms.has(room)) return;
  socket.to(room).emit("user:typing", { conversationId, userId, typing });
}

async function handleNotificationRead(socket: Socket, ack?: EmitAck): Promise<void> {
  const userId = String(socket.data.userId);
  try {
    await Notification.updateMany({ recipient: userId, seen: false }, { $set: { seen: true } });
    ack?.({ success: true });
  } catch (error) {
    socketError(socket, error);
    ack?.({ success: false });
  }
}

async function onConnection(socket: Socket): Promise<void> {
  const userId = String(socket.data.userId);
  trackSocket(userId, socket.id);
  socket.join(userRoom(userId));

  const affectedRooms: string[] = [];
  try {
    const conversations = await Conversation.find({ participants: userId }).select("_id").lean();
    for (const conversation of conversations) {
      const room = conversationRoom(conversation._id);
      socket.join(room);
      addRoomMember(room, userId);
      affectedRooms.push(room);
    }
  } catch (error) {
    logger.error({ err: error, userId }, "failed to join conversation rooms");
  }

  for (const room of affectedRooms) broadcastPresence(room);

  socket.on("message:send", (payload, ack) => void handleMessageSend(socket, payload, ack));
  socket.on("message:seen", (payload, ack) => void handleMessageSeen(socket, payload, ack));
  socket.on("typing:start", (payload) => handleTyping(socket, payload, true));
  socket.on("typing:stop", (payload) => handleTyping(socket, payload, false));
  socket.on(
    "notification:read",
    (ack) => void handleNotificationRead(socket, typeof ack === "function" ? ack : undefined),
  );

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((room) => room.startsWith(CONVERSATION_ROOM_PREFIX));
    untrackSocket(userId, socket.id);

    for (const room of rooms) {
      if (!isOnline(userId)) removeRoomMember(room, userId);
      broadcastPresence(room);
    }
  });
}

/**
 * Socket.IO setup: handshake authenticated with a short-lived signed ticket
 * (`GET /api/auth/socket-ticket`). Identity ALWAYS comes from the verified
 * ticket — `handshake.query.userId` is never trusted.
 */
export function initSocket(server: HttpServer, options: SocketInitOptions): Server {
  const instance = new Server(server, {
    cors: { origin: options.origins, credentials: true },
  });

  instance.use((socket, next) => {
    try {
      const ticket = (socket.handshake.auth as { ticket?: unknown } | undefined)?.ticket;
      const { userId } = verifyTicket(ticket, { secret: options.secret });
      socket.data.userId = userId;
      next();
    } catch (error) {
      const message = error instanceof ApiError && error.expose ? error.message : "Unauthorized";
      const failure = new Error(message) as Error & { data?: unknown };
      failure.data = { code: "UNAUTHORIZED" };
      next(failure);
    }
  });

  instance.on("connection", (socket) => {
    void onConnection(socket);
  });

  instance.on("error", (error) => logger.error({ err: error }, "socket.io server error"));

  io = instance;
  logger.info("socket.io initialized");
  return instance;
}

export async function closeSocket(): Promise<void> {
  if (!io) return;
  const instance = io;
  io = null;
  socketsByUser.clear();
  roomMembers.clear();
  await new Promise<void>((resolve) => instance.close(() => resolve()));
}
