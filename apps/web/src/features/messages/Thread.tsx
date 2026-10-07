import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ChevronUp,
  Loader2,
  MessagesSquare,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Avatar, Skeleton } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { dayLabel } from "./format";
import { senderId } from "./hooks";
import { Composer } from "./Composer";
import { EmptyThreadHint, MessageBubble } from "./MessageBubble";
import type { SendPayload } from "./hooks";
import type { Conversation, Message } from "@/types";

interface ThreadProps {
  conversationId: string;
  conversation?: Conversation;
  messages: Message[];
  loading: boolean;
  hasError: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  peerTyping: boolean;
  online: boolean;
  meId: string;
  presenceLabel: string;
  onRetry: () => void;
  onLoadOlder: () => void;
  onBack: () => void;
  onSend: (payload: SendPayload) => Promise<boolean>;
  onDelete: () => void;
}

function TypingDots({ label }: { label: string }) {
  return (
    <div
      className="border-border bg-surface-2 inline-flex items-center gap-1 rounded-2xl rounded-bl-md border px-3.5 py-3"
      role="status"
      aria-label={label}
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="bg-subtle h-1.5 w-1.5 rounded-full"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className={cn("flex items-end gap-2", index % 2 ? "justify-end" : "")}>
          {index % 2 === 0 && <Skeleton className="h-7 w-7 rounded-full" />}
          <Skeleton
            className={cn(
              "h-11 rounded-2xl",
              index % 2 ? "w-2/5 rounded-br-md" : "w-1/2 rounded-bl-md",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/** Right pane: header, message scroller (day dividers, load older), composer. */
export function Thread({
  conversationId,
  conversation,
  messages,
  loading,
  hasError,
  hasOlder,
  loadingOlder,
  peerTyping,
  online,
  meId,
  presenceLabel,
  onRetry,
  onLoadOlder,
  onBack,
  onSend,
  onDelete,
}: ThreadProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousHeight = useRef(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const peer = conversation?.otherUser;

  const handleScroll = () => {
    const element = scrollerRef.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    if (element.scrollTop < 40 && hasOlder && !loadingOlder) onLoadOlder();
  };

  /* remember the height before older messages land so the view doesn't jump */
  useEffect(() => {
    if (loadingOlder) {
      previousHeight.current = scrollerRef.current?.scrollHeight ?? 0;
    }
  }, [loadingOlder]);

  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    if (previousHeight.current > 0) {
      const delta = element.scrollHeight - previousHeight.current;
      element.scrollTop = Math.max(0, element.scrollTop + delta);
      previousHeight.current = 0;
      return;
    }
    if (stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightbox]);

  let lastDay = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <header className="border-border flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <IconButton label="Back to conversations" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>

        <Avatar src={peer?.profilePic} name={peer?.name ?? "?"} size="sm" online={online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peer?.name ?? "Conversation"}</p>
          <p className={cn("truncate text-xs", online ? "text-success" : "text-subtle")}>
            {peerTyping ? "typing…" : presenceLabel}
          </p>
        </div>

        <IconButton label="Delete conversation" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </header>

      {/* messages */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {loading && messages.length === 0 ? (
          <ThreadSkeleton />
        ) : hasError && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="text-danger h-9 w-9" aria-hidden="true" />
            <p className="text-muted text-sm">Couldn't load this thread.</p>
            <button
              type="button"
              onClick={onRetry}
              className="border-border hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
            >
              <RotateCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center py-6">
            <EmptyThreadHint peerName={peer?.name ?? "them"} />
          </div>
        ) : (
          <div className="space-y-1.5">
            {hasOlder && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={onLoadOlder}
                  className="border-border bg-surface-2 text-muted hover:border-brand-500/40 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {loadingOlder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  Load older messages
                </button>
              </div>
            )}

            {messages.map((message, index) => {
              const mine = senderId(message) === meId;
              const currentDay = dayLabel(message.createdAt);
              const next = messages[index + 1];
              const showAvatar = !mine && (!next || senderId(next) !== meId);
              const showDay = currentDay && currentDay !== lastDay;
              lastDay = currentDay;

              return (
                <div key={message._id}>
                  {showDay && (
                    <div className="my-4 flex items-center gap-3" role="separator">
                      <span className="bg-border h-px flex-1" />
                      <span className="text-subtle text-[11px] font-medium tracking-wider uppercase">
                        {currentDay}
                      </span>
                      <span className="bg-border h-px flex-1" />
                    </div>
                  )}
                  <div className="py-0.5">
                    <MessageBubble
                      message={message}
                      mine={mine}
                      showAvatar={showAvatar}
                      avatar={<Avatar src={peer?.profilePic} name={peer?.name ?? "?"} size="xs" />}
                      onImageClick={setLightbox}
                    />
                  </div>
                </div>
              );
            })}

            <AnimatePresence>
              {peerTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="pt-1"
                >
                  <TypingDots label={`${peer?.name ?? "Peer"} is typing`} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Composer conversationId={conversationId} onSend={onSend} />

      {/* image lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            style={{ background: "var(--overlay)" }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <motion.img
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              src={lightbox}
              alt="Shared attachment full size"
              className="max-h-[86dvh] max-w-[92vw] rounded-2xl object-contain shadow-lg"
              onClick={(event) => event.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close image preview"
              className="border-border bg-surface/90 hover:bg-surface-2 absolute top-4 right-4 rounded-xl border px-3 py-2 text-sm font-medium backdrop-blur transition-colors"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Placeholder shown on desktop when no conversation is selected. */
export function EmptyThreadPane({ hint }: { hint?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="bg-brand-500/10 text-brand-500 flex h-14 w-14 items-center justify-center rounded-2xl">
        <MessagesSquare className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold">Pick a conversation</h2>
      <p className="text-muted max-w-xs text-sm">
        {hint ?? "Choose a thread on the left to start chatting with your pack."}
      </p>
    </div>
  );
}
