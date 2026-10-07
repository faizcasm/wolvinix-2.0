import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { del, errorMessage, post } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { connectSocket, getSocket } from "@/lib/socket";
import { flattenPages, usePaginatedList, type Page } from "@/features/shared/usePaginatedList";
import { useAuthStore } from "@/stores/auth";
import type { CompactUser, Conversation, Message, Notification } from "@/types";
import { toast } from "sonner";

export type MessagePages = Page<Message>[];
export type ConversationPages = Page<Conversation>[];

export interface SendPayload {
  text?: string;
  imageUrl?: string;
}

/* ------------------------------- Queries -------------------------------- */

/** Conversations, sorted by last activity by the server. */
export function useConversations() {
  return usePaginatedList<Conversation>({
    queryKey: queryKeys.conversations,
    url: "/messages/conversations",
    limit: 30,
  });
}

/** One thread, newest window first — older pages arrive via "Load older". */
export function useConversationMessages(conversationId?: string) {
  return usePaginatedList<Message>({
    queryKey: conversationId ? queryKeys.messages(conversationId, 1) : ["messages", "idle"],
    url: `/messages/conversations/${conversationId ?? "idle"}/messages`,
    limit: 30,
    enabled: Boolean(conversationId),
  });
}

/** Flattens, de-duplicates and sorts a thread oldest → newest. */
export function useSortedMessages(pages?: MessagePages): Message[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const unique: Message[] = [];
    for (const message of flattenPages(pages)) {
      if (seen.has(message._id)) continue;
      seen.add(message._id);
      unique.push(message);
    }
    return unique.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }, [pages]);
}

/* -------------------------------- Realtime ------------------------------ */

export interface ChatSocketHandlers {
  onMessageNew?: (payload: { conversationId: string; message: Message }) => void;
  onMessageSeen?: (payload: { conversationId: string; userId: string; at: string }) => void;
  onUserTyping?: (payload: { conversationId: string; userId: string; typing: boolean }) => void;
  onPresence?: (payload: { userIds: string[] }) => void;
  onNotification?: (payload: { notification: Notification }) => void;
}

/**
 * Attaches the realtime listeners for a page. Handlers live in a ref so
 * callers may pass fresh closures every render while the effect runs once —
 * and every listener is `off()`-ed in the cleanup.
 */
export function useRealtime(handlers: ChatSocketHandlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    let disposed = false;
    let detach: (() => void) | null = null;

    void connectSocket().then((socket) => {
      if (disposed || !socket) return;

      const onMessageNew = (payload: { conversationId: string; message: Message }) =>
        latest.current.onMessageNew?.(payload);
      const onMessageSeen = (payload: { conversationId: string; userId: string; at: string }) =>
        latest.current.onMessageSeen?.(payload);
      const onUserTyping = (payload: { conversationId: string; userId: string; typing: boolean }) =>
        latest.current.onUserTyping?.(payload);
      const onPresence = (payload: { userIds: string[] }) => latest.current.onPresence?.(payload);
      const onNotification = (payload: { notification: Notification }) =>
        latest.current.onNotification?.(payload);

      socket.on("message:new", onMessageNew);
      socket.on("message:seen", onMessageSeen);
      socket.on("user:typing", onUserTyping);
      socket.on("presence:update", onPresence);
      socket.on("notification:new", onNotification);

      detach = () => {
        socket.off("message:new", onMessageNew);
        socket.off("message:seen", onMessageSeen);
        socket.off("user:typing", onUserTyping);
        socket.off("presence:update", onPresence);
        socket.off("notification:new", onNotification);
      };
    });

    return () => {
      disposed = true;
      detach?.();
      detach = null;
    };
  }, []);
}

/** Online ids reported by the server's room-scoped presence broadcasts. */
export function usePresence(): Set<string> {
  const [online, setOnline] = useState<string[]>([]);
  useRealtime({
    onPresence: (payload) => setOnline(payload?.userIds ?? []),
  });
  return useMemo(() => new Set(online), [online]);
}

/** Emits a room-scoped typing signal — identity is derived server-side. */
export function emitTyping(conversationId: string, typing: boolean): void {
  getSocket()?.emit(typing ? "typing:start" : "typing:stop", {
    conversationId,
  });
}

/** Tells the server the viewer read the thread (drives the double ticks). */
export function emitSeen(conversationId: string): void {
  getSocket()?.emit("message:seen", { conversationId });
}

/* ----------------------------- Cache helpers ---------------------------- */

/** The API sometimes returns plain ids where the type says populated users. */
export function senderId(message: Message): string {
  const sender: unknown = message.sender;
  if (typeof sender === "string") return sender;
  if (sender && typeof sender === "object" && "_id" in sender) {
    return String((sender as { _id: unknown })._id);
  }
  return "";
}

function appendMessage(pages: MessagePages | undefined, message: Message): MessagePages {
  if (!pages?.length) return [{ items: [message] }];
  const [first, ...rest] = pages;
  return [{ ...first, items: [...first.items, message] }, ...rest];
}

/** Inserts an echo, replacing the optimistic copy it corresponds to. */
export function mergeIncomingMessage(
  pages: MessagePages | undefined,
  incoming: Message,
): MessagePages | undefined {
  if (!pages?.length) return pages;
  const exists = pages.some((page) => page.items.some((item) => item._id === incoming._id));
  if (exists) return pages;

  const first = pages[0];
  const incomingSender = senderId(incoming);
  const pendingIndex = first.items.findIndex(
    (item) =>
      item._id.startsWith("tmp-") &&
      senderId(item) === incomingSender &&
      item.text === incoming.text &&
      (item.imageUrl ?? "") === (incoming.imageUrl ?? ""),
  );

  const items = [...first.items];
  if (pendingIndex >= 0) items[pendingIndex] = incoming;
  else items.push(incoming);

  return [{ ...first, items }, ...pages.slice(1)];
}

function replaceMessage(
  pages: MessagePages | undefined,
  tempId: string,
  delivered: Message,
): MessagePages | undefined {
  if (!pages?.length) return pages;
  return pages.map((page, index) => {
    if (index !== 0) return page;
    if (!page.items.some((item) => item._id === tempId)) return page;
    return {
      ...page,
      items: page.items.map((item) => (item._id === tempId ? delivered : item)),
    };
  });
}

function removeMessage(pages: MessagePages | undefined, tempId: string): MessagePages | undefined {
  if (!pages?.length) return pages;
  return pages.map((page, index) =>
    index !== 0 || !page.items.some((item) => item._id === tempId)
      ? page
      : { ...page, items: page.items.filter((item) => item._id !== tempId) },
  );
}

/** Marks the viewer's own messages as read by the peer. */
function markMineSeen(pages: MessagePages | undefined, myId: string): MessagePages | undefined {
  if (!pages?.length) return pages;
  return pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      senderId(item) === myId && !item.seen ? { ...item, seen: true } : item,
    ),
  }));
}

function patchConversation(
  client: QueryClient,
  conversationId: string,
  patch: (conversation: Conversation) => Conversation,
): void {
  client.setQueriesData<ConversationPages>({ queryKey: queryKeys.conversations }, (pages) => {
    if (!Array.isArray(pages)) return pages;
    let dirty = false;
    const next = pages.map((page) => {
      if (!page || !Array.isArray(page.items)) return page;
      const items = page.items.map((item) => {
        if (item._id !== conversationId) return item;
        dirty = true;
        return patch(item);
      });
      return { ...page, items };
    });
    return dirty ? next : pages;
  });
}

/* -------------------------------- Sending ------------------------------- */

function extractMessage(body: unknown): Message | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const candidate = (record.message ?? record.data ?? record) as Partial<Message> | null;
  if (candidate && typeof candidate._id === "string" && !candidate._id.startsWith("tmp-")) {
    return candidate as Message;
  }
  return null;
}

/**
 * Sends over the socket first (server persists + relays) and falls back to
 * the REST endpoint whenever the socket is absent or does not ack in time.
 */
async function deliver(conversationId: string, payload: SendPayload): Promise<Message | null> {
  const socket: Socket | null = getSocket();
  if (socket?.connected) {
    try {
      const timed = socket.timeout(3500) as unknown as {
        emit: (
          event: string,
          body: unknown,
          ack: (error?: Error | null, response?: unknown) => void,
        ) => void;
      };
      const body = await new Promise<unknown>((resolve, reject) => {
        timed.emit("message:send", { conversationId, ...payload }, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      });
      return extractMessage(body);
    } catch {
      /* no ack or timed out — the REST call below is authoritative */
    }
  }
  return await post<Message>(`/messages/conversations/${conversationId}/messages`, payload);
}

/** Optimistic send: append instantly, reconcile (or roll back) on settle. */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  const send = useCallback(
    async (payload: SendPayload): Promise<boolean> => {
      const text = payload.text?.trim();
      if (!conversationId || (!text && !payload.imageUrl)) return false;

      const user = useAuthStore.getState().user;
      const sender: CompactUser = {
        _id: user?._id ?? "",
        name: user?.name ?? "You",
        username: user?.username ?? "",
        profilePic: user?.profilePic ?? "",
      };
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: Message = {
        _id: tempId,
        conversationId,
        sender,
        text: text ?? "",
        imageUrl: payload.imageUrl ?? "",
        seen: false,
        createdAt: new Date().toISOString(),
      };

      const messagesKey = { queryKey: ["messages", conversationId] };
      queryClient.setQueriesData<MessagePages>(messagesKey, (pages) =>
        appendMessage(pages, optimistic),
      );
      patchConversation(queryClient, conversationId, (conversation) => ({
        ...conversation,
        lastMessage: {
          text: optimistic.text || "Sent a photo",
          sender: sender._id,
          seen: false,
          createdAt: optimistic.createdAt,
        },
      }));

      try {
        const delivered = await deliver(conversationId, {
          text: text || undefined,
          imageUrl: payload.imageUrl,
        });
        if (delivered) {
          queryClient.setQueriesData<MessagePages>(messagesKey, (pages) =>
            replaceMessage(pages, tempId, delivered),
          );
        }
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations,
        });
        return true;
      } catch (error) {
        queryClient.setQueriesData<MessagePages>(messagesKey, (pages) =>
          removeMessage(pages, tempId),
        );
        toast.error(errorMessage(error, "Message could not be sent"));
        return false;
      }
    },
    [conversationId, queryClient],
  );

  return { send };
}

/* ------------------------------- Mutations ------------------------------ */

/** Uploads an image to the media endpoint and returns its CDN url. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const result = await post<{ url: string }>("/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return result.url;
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useCallback(
    async (conversationId: string) => {
      await del(`/messages/conversations/${conversationId}`);
      await queryClient.removeQueries({
        queryKey: ["messages", conversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations,
      });
    },
    [queryClient],
  );
}

/** Zeroes the unread pill the moment a thread is opened. */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useCallback(
    (conversationId: string) => {
      patchConversation(queryClient, conversationId, (conversation) => ({
        ...conversation,
        unreadCount: 0,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
    [queryClient],
  );
}

/* ------------------------------ Cache appliers -------------------------- */

/** Applies `message:new` to the open thread + the conversation list. */
export function useIncomingMessageHandler(activeConversationId?: string) {
  const queryClient = useQueryClient();

  return useCallback(
    ({ conversationId, message }: { conversationId: string; message: Message }) => {
      if (!message) return;
      queryClient.setQueriesData<MessagePages>(
        { queryKey: ["messages", conversationId] },
        (pages) => mergeIncomingMessage(pages, message),
      );

      const myId = useAuthStore.getState().user?._id ?? "";
      const mine = senderId(message) === myId;
      const isOpen = conversationId === activeConversationId;

      patchConversation(queryClient, conversationId, (conversation) => ({
        ...conversation,
        lastMessage: {
          text: message.text || "Sent a photo",
          sender: senderId(message),
          seen: mine || isOpen,
          createdAt: message.createdAt,
        },
        unreadCount: mine || isOpen ? 0 : (conversation.unreadCount ?? 0) + 1,
        updatedAt: message.createdAt ?? conversation.updatedAt,
      }));
    },
    [activeConversationId, queryClient],
  );
}

/** Applies `message:seen` to the open thread's own bubbles. */
export function useSeenHandler(activeConversationId?: string) {
  const queryClient = useQueryClient();
  const myId = useAuthStore((state) => state.user?._id ?? "");

  return useCallback(
    ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (!activeConversationId || conversationId !== activeConversationId) return;
      if (userId && userId === myId) return;
      queryClient.setQueriesData<MessagePages>(
        { queryKey: ["messages", conversationId] },
        (pages) => markMineSeen(pages, myId),
      );
    },
    [activeConversationId, myId, queryClient],
  );
}
