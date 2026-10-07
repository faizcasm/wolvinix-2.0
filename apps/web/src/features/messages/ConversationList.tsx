import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, MessageSquareDashed, RotateCw, Search, X } from "lucide-react";
import { Avatar, EmptyState, Skeleton } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { previewText, previewTime } from "./format";
import type { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  loading: boolean;
  hasError: boolean;
  online: Set<string>;
  onRetry: () => void;
  onSelect: (id: string) => void;
}

function ConversationSkeleton() {
  return (
    <ul className="space-y-1 p-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 rounded-xl p-2.5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Left pane: searchable conversation list with presence + unread badges. */
export function ConversationList({
  conversations,
  activeId,
  loading,
  hasError,
  online,
  onRetry,
  onSelect,
}: ConversationListProps) {
  const [filter, setFilter] = useState("");
  const reduceMotion = useReducedMotion();

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) => {
      const peer = conversation.otherUser;
      const preview = previewText(conversation.lastMessage?.text);
      return (
        peer?.name?.toLowerCase().includes(needle) ||
        peer?.username?.toLowerCase().includes(needle) ||
        preview.toLowerCase().includes(needle)
      );
    });
  }, [conversations, filter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border border-b p-3">
        <div className="relative">
          <Search
            className="text-subtle pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="border-border bg-surface-2 text-foreground placeholder:text-subtle hover:border-border-strong focus:border-brand-500 h-10 w-full rounded-xl border pr-9 pl-9 text-sm transition-colors outline-none"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              aria-label="Clear conversation search"
              className="text-subtle hover:bg-surface-3 hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 scrollbar-none overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <ConversationSkeleton />
        ) : hasError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle className="text-danger h-9 w-9" aria-hidden="true" />
            <p className="text-muted text-sm">Couldn't load your conversations.</p>
            <button
              type="button"
              onClick={onRetry}
              className="border-border hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
            >
              <RotateCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={
                filter ? (
                  <Search className="h-6 w-6" />
                ) : (
                  <MessageSquareDashed className="h-6 w-6" />
                )
              }
              title={filter ? "No matches" : "No conversations yet"}
              description={
                filter
                  ? "Nothing matches that search. Try another name."
                  : "Jump into a profile and say hi — your threads will show up here."
              }
            />
          </div>
        ) : (
          <motion.ul
            className="space-y-1 p-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduceMotion ? 0 : 0.04 } },
            }}
          >
            <AnimatePresence initial={false}>
              {visible.map((conversation) => {
                const peer = conversation.otherUser;
                const active = conversation._id === activeId;
                const unread = conversation.unreadCount ?? 0;
                const isOnline = peer ? online.has(peer._id) : false;
                const preview = previewText(conversation.lastMessage?.text);

                return (
                  <motion.li
                    key={conversation._id}
                    layout={!reduceMotion}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 },
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conversation._id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                        active
                          ? "bg-brand-500/12"
                          : "hover:bg-surface-2 focus-visible:bg-surface-2",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="conversation-active"
                          className="bg-brand-500 absolute inset-y-1.5 -left-1 w-1 rounded-full"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Avatar
                        src={peer?.profilePic}
                        name={peer?.name ?? "?"}
                        size="md"
                        online={isOnline}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {peer?.name ?? "Conversation"}
                          </span>
                          <span className="text-subtle tabular shrink-0 text-[11px]">
                            {conversation.lastMessage?.createdAt
                              ? previewTime(conversation.lastMessage.createdAt)
                              : previewTime(conversation.updatedAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-xs",
                              unread > 0 ? "text-foreground font-medium" : "text-muted",
                            )}
                          >
                            {preview || "Say something"}
                          </span>
                          {unread > 0 && (
                            <span className="bg-brand-500 tabular flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {!loading && !hasError && visible.length > 0 && (
        <div className="border-border text-subtle border-t px-4 py-2.5 text-[11px]">
          {conversations.length} conversation
          {conversations.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
