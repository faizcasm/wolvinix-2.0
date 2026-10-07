import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNowStrict, isToday } from "date-fns";
import {
  AtSign,
  Bell,
  Camera,
  CheckCheck,
  Heart,
  Info,
  Loader2,
  MessageCircle,
  RotateCw,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { del, errorMessage, put } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { flattenPages, usePaginatedList, type Page } from "@/features/shared/usePaginatedList";
import { useRealtime } from "@/features/messages/hooks";
import { toast } from "sonner";
import type { Notification, NotificationType } from "@/types";

type NotificationPages = Page<Notification>[];
/** Prefix filter — matches every paginated notifications query. */
const NOTIFICATIONS_FILTER = { queryKey: ["notifications"] };

interface TypeMeta {
  icon: LucideIcon;
  label: string;
  badge: string;
}

const TYPE_META: Record<NotificationType, TypeMeta> = {
  like: { icon: Heart, label: "Like", badge: "bg-danger-soft text-danger" },
  reply: {
    icon: MessageCircle,
    label: "Reply",
    badge: "bg-accent-soft text-accent",
  },
  follow: { icon: UserPlus, label: "Follow", badge: "bg-lime-soft text-lime" },
  tag: { icon: AtSign, label: "Mention", badge: "bg-brand-500/15 text-brand-600" },
  story: {
    icon: Camera,
    label: "Story",
    badge: "bg-warning-soft text-warning",
  },
  clan: { icon: Users, label: "Clan", badge: "bg-brand-500/15 text-brand-600" },
  system: { icon: Info, label: "System", badge: "bg-surface-3 text-muted" },
};

/** Where a notification sends you when tapped. */
function notificationTarget(notification: Notification): string | null {
  const postId = typeof notification.post === "string" ? notification.post : notification.post?._id;
  if (postId) return `/post/${postId}`;

  const username = notification.sender?.username;
  if (notification.type === "clan") return "/clans";
  if (username && ["like", "reply", "follow", "tag", "story"].includes(notification.type)) {
    return `/profile/${username}`;
  }
  return null;
}

function markAllSeen(pages: NotificationPages): NotificationPages {
  return pages.map((page) => ({
    ...page,
    items: page.items.map((item) => (item.seen ? item : { ...item, seen: true })),
  }));
}

function prepend(
  pages: NotificationPages | undefined,
  notification: Notification,
): NotificationPages | undefined {
  if (!pages?.length) return pages;
  const exists = pages.some((page) => page.items.some((item) => item._id === notification._id));
  if (exists) return pages;
  const [first, ...rest] = pages;
  return [{ ...first, items: [notification, ...first.items] }, ...rest];
}

function withoutId(
  pages: NotificationPages | undefined,
  id: string,
): NotificationPages | undefined {
  if (!pages?.length) return pages;
  return pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => item._id !== id),
  }));
}

function mapAll(
  pages: NotificationPages | undefined,
  update: (items: Notification[]) => Notification[],
): NotificationPages | undefined {
  if (!pages?.length) return pages;
  return pages.map((page) => ({ ...page, items: update(page.items) }));
}

function invalidateUnread(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
}

function RowSkeleton() {
  return (
    <li className="border-border flex items-center gap-3 rounded-xl border p-3.5">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </li>
  );
}

function NotificationRow({
  notification,
  onDelete,
  index = 0,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  const meta = TYPE_META[notification.type] ?? TYPE_META.system;
  const Icon = meta.icon;
  const target = notificationTarget(notification);
  const relative = formatDistanceToNowStrict(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const body = (
    <>
      <span
        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.badge)}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm leading-snug",
            notification.seen ? "text-muted" : "text-foreground font-medium",
          )}
        >
          {notification.message}
        </span>
        <span className="text-subtle mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span>{meta.label}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular">{relative}</span>
          {!notification.seen && (
            <span className="bg-brand-500/15 text-brand-600 rounded-full px-2 py-0.5 text-[10px] font-semibold">
              New
            </span>
          )}
        </span>
      </span>
    </>
  );

  return (
    <motion.li
      layout={!reduceMotion}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
        delay: reduceMotion ? 0 : Math.min(index, 8) * 0.04,
      }}
      className={cn(
        "relative flex items-center gap-2 rounded-xl border px-3 py-3 transition-colors",
        notification.seen
          ? "border-border hover:border-border-strong hover:bg-surface-2"
          : "border-brand-500/35 bg-brand-500/8",
      )}
    >
      {target ? (
        <Link
          to={target}
          className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      <IconButton
        label={`Delete notification: ${meta.label}`}
        onClick={() => onDelete(notification._id)}
        className="relative z-10"
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </motion.li>
  );
}

function Group({
  label,
  notifications,
  onDelete,
}: {
  label: string;
  notifications: Notification[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-subtle px-1 text-xs font-semibold tracking-widest uppercase">
        {label}
      </h2>
      <ul className="space-y-2">
        {" "}
        <AnimatePresence initial={false}>
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

/** `/notifications` — grouped inbox with live socket appends. */
export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState<"read" | "clear" | null>(null);

  const list = usePaginatedList<Notification>({
    queryKey: queryKeys.notifications(1),
    url: "/notifications",
    limit: 20,
  });

  const notifications = useMemo(() => flattenPages(list.data?.pages), [list.data]);

  const { today, earlier } = useMemo(() => {
    const bucket = { today: [] as Notification[], earlier: [] as Notification[] };
    for (const notification of notifications) {
      const date = new Date(notification.createdAt);
      if (!Number.isNaN(date.getTime()) && isToday(date)) bucket.today.push(notification);
      else bucket.earlier.push(notification);
    }
    return bucket;
  }, [notifications]);

  /* live append + toast for pushes that arrive while the page is open */
  useRealtime({
    onNotification: ({ notification }) => {
      if (!notification?._id) return;
      queryClient.setQueriesData<NotificationPages>(NOTIFICATIONS_FILTER, (pages) =>
        prepend(pages, notification),
      );
      invalidateUnread(queryClient);
      toast(notification.message || "New notification", {
        description: TYPE_META[notification.type]?.label ?? "Update",
      });
    },
  });

  const handleDelete = async (id: string) => {
    queryClient.setQueriesData<NotificationPages>(NOTIFICATIONS_FILTER, (pages) =>
      withoutId(pages, id),
    );
    try {
      await del(`/notifications/${id}`);
      invalidateUnread(queryClient);
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete that notification"));
      await list.refetch();
    }
  };

  const markAllRead = async () => {
    setBusy("read");
    try {
      await put("/notifications/read");
      queryClient.setQueriesData<NotificationPages>(NOTIFICATIONS_FILTER, (pages) =>
        pages?.length ? markAllSeen(pages) : pages,
      );
      getSocket()?.emit("notification:read");
      invalidateUnread(queryClient);
      toast.success("All caught up");
    } catch (error) {
      toast.error(errorMessage(error, "Could not mark everything read"));
    } finally {
      setBusy(null);
    }
  };

  const clearAll = async () => {
    setBusy("clear");
    try {
      await del("/notifications");
      queryClient.setQueriesData<NotificationPages>(NOTIFICATIONS_FILTER, (pages) =>
        pages?.length ? mapAll(pages, () => []) : pages,
      );
      invalidateUnread(queryClient);
      setConfirmClear(false);
      toast.success("Notifications cleared");
    } catch (error) {
      toast.error(errorMessage(error, "Could not clear notifications"));
    } finally {
      setBusy(null);
    }
  };

  const loading = list.isLoading;
  const hasError = list.isError && notifications.length === 0;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-muted text-sm">Likes, replies, follows and clan news.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            label="Mark all as read"
            onClick={() => void markAllRead()}
            disabled={busy === "read" || notifications.length === 0}
          >
            {busy === "read" ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <CheckCheck className="h-4.5 w-4.5" />
            )}
          </IconButton>
          <IconButton
            label="Clear all notifications"
            onClick={() => setConfirmClear(true)}
            disabled={notifications.length === 0}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </IconButton>
        </div>
      </header>

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </ul>
      ) : hasError ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-2xl border px-6 py-14 text-center">
          <Info className="text-danger h-9 w-9" aria-hidden="true" />
          <p className="text-muted text-sm">Couldn't load your notifications.</p>
          <button
            type="button"
            onClick={() => void list.refetch()}
            className="border-border hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
          >
            <RotateCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Nothing new"
          description="When someone likes a post, replies, follows you or invites you to a clan, it lands here."
          action={
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-brand-500 hover:bg-brand-400 mt-1 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Back to feed
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <Group label="Today" notifications={today} onDelete={(id) => void handleDelete(id)} />
          )}
          {earlier.length > 0 && (
            <Group
              label="Earlier"
              notifications={earlier}
              onDelete={(id) => void handleDelete(id)}
            />
          )}

          <div className="flex justify-center">
            {list.hasNextPage ? (
              <button
                type="button"
                onClick={() => void list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
                className="border-border hover:bg-surface-2 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {list.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </button>
            ) : (
              <span className="text-subtle text-xs">You've reached the end</span>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void clearAll()}
        title="Clear all notifications?"
        message="Every notification in this list will be removed for you. This cannot be undone."
        confirmLabel="Clear all"
        destructive
        loading={busy === "clear"}
      />
    </div>
  );
}
