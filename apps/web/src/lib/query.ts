import { QueryClient } from "@tanstack/react-query";

/**
 * Query client tuned for a social feed:
 *  - short staleness so new posts surface quickly
 *  - no refetch-on-focus storms on mobile
 *  - retries only for transient failures, never for 4xx
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  session: ["session"] as const,
  feed: (page: number) => ["feed", page] as const,
  explore: (page: number) => ["explore", page] as const,
  post: (id: string) => ["post", id] as const,
  userPosts: (username: string, tab: string, page: number) =>
    ["user-posts", username, tab, page] as const,
  profile: (username: string) => ["profile", username] as const,
  followers: (id: string, type: string) => ["followers", id, type] as const,
  suggested: ["suggested"] as const,
  search: (q: string, page: number) => ["search", q, page] as const,
  stories: ["stories"] as const,
  conversations: ["conversations"] as const,
  messages: (id: string, page: number) => ["messages", id, page] as const,
  clans: (q: string, page: number) => ["clans", q, page] as const,
  clan: (id: string) => ["clan", id] as const,
  myClan: ["my-clan"] as const,
  notifications: (page: number) => ["notifications", page] as const,
  unreadCount: ["unread-count"] as const,
  stats: (userId: string) => ["stats", userId] as const,
  leaderboard: (page: number) => ["leaderboard", page] as const,
  reviews: (page: number) => ["reviews", page] as const,
  bookmarks: (page: number) => ["bookmarks", page] as const,
  hashtags: ["hashtags"] as const,
  hashtagPosts: (tag: string, page: number) => ["hashtag", tag, page] as const,
};
