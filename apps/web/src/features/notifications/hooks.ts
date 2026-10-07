import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, get, patch, del, post } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type { Notification, PaginationMeta } from "@/types";
import { useCallback } from "react";

interface NotificationPage {
  data: Notification[];
  meta?: PaginationMeta;
}

/** Polls unread counts; keeps the sidebar / bottom-nav badges live. */
export function useUnreadCounts() {
  const { data } = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const [notifications, messages] = await Promise.allSettled([
        get<{ count: number }>("/notifications/unread-count"),
        get<{ count: number }>("/messages/unread-count"),
      ]);
      return {
        unread: notifications.status === "fulfilled" ? notifications.value.count : 0,
        unreadMessages: messages.status === "fulfilled" ? messages.value.count : 0,
      };
    },
    refetchInterval: 45_000,
    staleTime: 20_000,
    retry: 1,
  });

  return { unread: data?.unread ?? 0, unreadMessages: data?.unreadMessages ?? 0 };
}

export function useNotifications(page = 1) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: async () => {
      const { data, meta } = await getData<Notification[]>("/notifications", {
        params: { page, limit: 20 },
      });
      return { data, meta } as NotificationPage;
    },
    placeholderData: (previous) => previous,
  });

  const markAllRead = useCallback(async () => {
    await patch("/notifications/read");
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
  }, [queryClient]);

  const removeOne = useCallback(
    async (id: string) => {
      await del(`/notifications/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
    [queryClient],
  );

  const clearAll = useCallback(async () => {
    await del("/notifications");
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
  }, [queryClient]);

  return { ...query, markAllRead, removeOne, clearAll };
}

/** Pushes a local "read" signal through the socket for instant cross-tab sync. */
export function notifyRead(socket: { emit: (event: string) => void } | null) {
  socket?.emit("notification:read");
}

export { post as postRequest };
