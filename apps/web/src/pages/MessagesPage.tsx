import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { ConfirmDialog } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { ConversationList } from "@/features/messages/ConversationList";
import { EmptyThreadPane, Thread } from "@/features/messages/Thread";
import {
  emitSeen,
  useRealtime,
  useConversations,
  useConversationMessages,
  useDeleteConversation,
  useIncomingMessageHandler,
  useMarkConversationRead,
  usePresence,
  useSeenHandler,
  useSendMessage,
  useSortedMessages,
} from "@/features/messages/hooks";
import { toast } from "sonner";
import type { Message } from "@/types";

/**
 * `/messages` → conversation list.
 * `/messages/:conversationId` → the thread (own pane on mobile, right pane on
 * desktop). The page owns its own scroll area so the bottom nav never covers
 * the composer.
 */
export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const meId = me?._id ?? "";

  const conversations = useConversations();
  const conversationList = useMemo(
    () => flattenPages(conversations.data?.pages),
    [conversations.data],
  );
  const conversation = useMemo(
    () => conversationList.find((item) => item._id === conversationId),
    [conversationList, conversationId],
  );

  const messagesQuery = useConversationMessages(conversationId);
  const messages = useSortedMessages(messagesQuery.data?.pages);
  const online = usePresence();

  const [peerTyping, setPeerTyping] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const typingTimer = useRef<number | null>(null);

  const incoming = useIncomingMessageHandler(conversationId);
  const seenHandler = useSeenHandler(conversationId);
  const markRead = useMarkConversationRead();
  const removeConversation = useDeleteConversation();
  const { send } = useSendMessage(conversationId ?? "");

  const handleIncoming = useCallback(
    (payload: { conversationId: string; message: Message }) => {
      incoming(payload);
      if (payload.conversationId === conversationId) emitSeen(conversationId);
    },
    [conversationId, incoming],
  );

  const handleTyping = useCallback(
    (payload: { conversationId: string; userId: string; typing: boolean }) => {
      if (!conversationId || payload.conversationId !== conversationId) return;
      if (payload.userId && payload.userId === meId) return;
      setPeerTyping(payload.typing !== false);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setPeerTyping(false), 3000);
    },
    [conversationId, meId],
  );

  useRealtime({
    onMessageNew: handleIncoming,
    onMessageSeen: seenHandler,
    onUserTyping: handleTyping,
  });

  /* opening a thread marks it read and tells the server we saw the messages */
  useEffect(() => {
    if (!conversationId) return;
    markRead(conversationId);
    emitSeen(conversationId);
  }, [conversationId, markRead]);

  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  const handleDelete = async () => {
    if (!conversationId) return;
    setDeleting(true);
    try {
      await removeConversation(conversationId);
      toast.success("Conversation deleted");
      setConfirmOpen(false);
      navigate("/messages");
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete that conversation"));
    } finally {
      setDeleting(false);
    }
  };

  const peer = conversation?.otherUser;
  const peerOnline = peer ? online.has(peer._id) : false;
  const presenceLabel = peerOnline
    ? "Online"
    : conversation?.updatedAt
      ? `Last seen ${formatDistanceToNowStrict(new Date(conversation.updatedAt), {
          addSuffix: true,
        })}`
      : "Offline";

  return (
    <section className="border-border bg-elevated flex h-[calc(100dvh-168px)] min-h-[400px] w-full overflow-hidden rounded-2xl border lg:h-[calc(100dvh-68px)]">
      {/* conversation list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className={cn(
          "border-border w-full shrink-0 flex-col border-r lg:flex lg:w-72 xl:w-80",
          conversationId ? "hidden" : "flex",
        )}
      >
        <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
          <h1 className="font-display text-base font-bold">Messages</h1>
          <span className="text-subtle text-[11px]">
            {conversationList.length > 0 ? `${conversationList.length} threads` : "your inbox"}
          </span>
        </div>
        <ConversationList
          conversations={conversationList}
          activeId={conversationId}
          loading={conversations.isLoading}
          hasError={conversations.isError}
          online={online}
          onRetry={() => void conversations.refetch()}
          onSelect={(id) => navigate(`/messages/${id}`)}
        />
      </motion.div>

      {/* thread */}
      <div className={cn("min-w-0 flex-1 flex-col", conversationId ? "flex" : "hidden lg:flex")}>
        <AnimatePresence mode="wait" initial={false}>
          {conversationId ? (
            <motion.div
              key={conversationId}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <Thread
                conversationId={conversationId}
                conversation={conversation}
                messages={messages}
                loading={messagesQuery.isLoading}
                hasError={messagesQuery.isError}
                hasOlder={Boolean(messagesQuery.hasNextPage)}
                loadingOlder={messagesQuery.isFetchingNextPage}
                peerTyping={peerTyping}
                online={peerOnline}
                meId={meId}
                presenceLabel={presenceLabel}
                onRetry={() => void messagesQuery.refetch()}
                onLoadOlder={() => void messagesQuery.fetchNextPage()}
                onBack={() => navigate("/messages")}
                onSend={send}
                onDelete={() => setConfirmOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <EmptyThreadPane hint={emptyHint(conversationList.length)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete conversation?"
        message="This removes the whole thread from your inbox. The other person keeps their copy."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </section>
  );
}

function emptyHint(count: number) {
  return count === 0
    ? "You have no conversations yet — open a profile and send your first message."
    : "Choose a thread on the left to start chatting with your pack.";
}
