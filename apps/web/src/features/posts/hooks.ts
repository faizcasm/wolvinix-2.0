import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { del, errorMessage, get, patch, post, put } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { usePaginatedList } from "@/features/shared/usePaginatedList";
import type { CompactUser, HashtagTrend, MediaType, Post, Reply } from "@/types";

/* ------------------------------------------------------------------ *
 * Cache surgery
 *
 * Posts live in many caches at once (feed, explore, bookmarks, hashtag,
 * profile, single post, search). An optimistic like must land in every
 * copy or the UI flickers the moment one of them refetches — so we walk
 * each cached value and patch any post we find.
 * ------------------------------------------------------------------ */

interface PostMutationContext {
  snapshot: [QueryKey, unknown][];
}

/** Every query prefix that can contain posts. */
const POST_QUERY_PREFIXES: QueryKey[] = [
  ["feed"],
  ["explore"],
  ["bookmarks"],
  ["hashtag"],
  ["user-posts"],
  ["post"],
  ["search"],
  ["hashtags"],
];

function invalidatePostQueries(queryClient: QueryClient) {
  POST_QUERY_PREFIXES.forEach((prefix) => {
    queryClient.invalidateQueries({ queryKey: prefix });
  });
}

function isPostLike(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Post>;
  return (
    typeof candidate._id === "string" &&
    typeof candidate.text === "string" &&
    Array.isArray(candidate.likes) &&
    typeof candidate.likesCount === "number"
  );
}

/** Returns a copy of `value` with every post replaced by `update(post)`. */
function mapPostDeep(value: unknown, update: (post: Post) => Post, depth = 8): unknown {
  if (depth <= 0) return value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const mapped = mapPostDeep(item, update, depth - 1);
      if (mapped !== item) changed = true;
      return mapped;
    });
    return changed ? next : value;
  }

  if (!value || typeof value !== "object") return value;
  if (isPostLike(value)) return update(value);

  const record = value as Record<string, unknown>;
  let changed = false;
  const next: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    const mapped = mapPostDeep(record[key], update, depth - 1);
    if (mapped !== record[key]) changed = true;
    next[key] = mapped;
  });
  return changed ? next : value;
}

function restoreSnapshot(queryClient: QueryClient, snapshot: [QueryKey, unknown][]) {
  snapshot.forEach(([key, data]) => {
    if (data === undefined) return;
    queryClient.setQueryData(key, data);
  });
}

function writeSnapshot(
  queryClient: QueryClient,
  snapshot: [QueryKey, unknown][],
  update: (post: Post) => Post,
) {
  snapshot.forEach(([key, data]) => {
    if (data === undefined) return;
    queryClient.setQueryData(key, mapPostDeep(data, update));
  });
}

/** Cancel → snapshot → patch → rollback on error → invalidate on settle. */
function useOptimisticPostMutation<TVariables, TData>({
  mutationFn,
  select,
  successMessage,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  select: (variables: TVariables) => (post: Post) => Post;
  successMessage?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, PostMutationContext>({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries();
      const snapshot = queryClient.getQueriesData<unknown>({});
      writeSnapshot(queryClient, snapshot, select(variables));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSettled: (data, error) => {
      invalidatePostQueries(queryClient);
      if (successMessage && !error) toast.success(successMessage);
    },
  });
}

function applyLike(cached: Post, userId: string, liked: boolean): Post {
  const has = cached.likes.includes(userId);
  if (has === liked) return cached;
  return {
    ...cached,
    likes: liked ? [...cached.likes, userId] : cached.likes.filter((id) => id !== userId),
    likesCount: Math.max(0, cached.likesCount + (liked ? 1 : -1)),
  };
}

function applyBookmark(cached: Post, userId: string, bookmarked: boolean): Post {
  const bookmarks = cached.bookmarks ?? [];
  const has = bookmarks.includes(userId);
  if (has === bookmarked) return cached;
  return {
    ...cached,
    bookmarks: bookmarked ? [...bookmarks, userId] : bookmarks.filter((id) => id !== userId),
    bookmarksCount: Math.max(0, (cached.bookmarksCount ?? 0) + (bookmarked ? 1 : -1)),
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function isLiked(post: Post, userId = "") {
  return (post.likes ?? []).includes(userId);
}

export function isBookmarked(post: Post, userId = "") {
  return (post.bookmarks ?? []).includes(userId);
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

/** The signed-in user's home feed. */
export function useFeed() {
  return usePaginatedList<Post>({ queryKey: queryKeys.feed(1), url: "/posts/feed", limit: 10 });
}

/** Trending posts (server scored by likes + replies + recency). */
export function useExplore() {
  return usePaginatedList<Post>({
    queryKey: queryKeys.explore(1),
    url: "/posts/explore",
    limit: 12,
  });
}

export function useBookmarks() {
  return usePaginatedList<Post>({
    queryKey: queryKeys.bookmarks(1),
    url: "/posts/bookmarks",
    limit: 10,
  });
}

export function useHashtagFeed(tag: string) {
  return usePaginatedList<Post>({
    queryKey: queryKeys.hashtagPosts(tag, 1),
    url: `/posts/hashtags/${encodeURIComponent(tag)}`,
    limit: 10,
    enabled: Boolean(tag),
  });
}

export function usePost(postId?: string) {
  return useQuery<Post, Error>({
    queryKey: queryKeys.post(postId ?? ""),
    queryFn: () => get<Post>(`/posts/${postId ?? ""}`),
    enabled: Boolean(postId),
  });
}

export function useTrendingHashtags() {
  return useQuery<HashtagTrend[], Error>({
    queryKey: queryKeys.hashtags,
    queryFn: () => get<HashtagTrend[]>("/posts/hashtags"),
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

/** Optimistic toggle of a like — `PUT /posts/:id/like`. */
export function useLikePost() {
  const me = useAuthStore((state) => state.user);
  const userId = me?._id ?? "";

  return useOptimisticPostMutation<Post, { liked: boolean; likesCount: number }>({
    mutationFn: (item) => put<{ liked: boolean; likesCount: number }>(`/posts/${item._id}/like`),
    select: (item) => (cached) => applyLike(cached, userId, !item.likes.includes(userId)),
  });
}

/** Optimistic toggle of a save — `POST /posts/:id/bookmark`. */
export function useBookmarkPost() {
  const me = useAuthStore((state) => state.user);
  const userId = me?._id ?? "";

  return useOptimisticPostMutation<Post, { bookmarked: boolean; bookmarksCount: number }>({
    mutationFn: (item) =>
      post<{ bookmarked: boolean; bookmarksCount: number }>(`/posts/${item._id}/bookmark`),
    select: (item) => (cached) => applyBookmark(cached, userId, !item.bookmarks.includes(userId)),
  });
}

/** Publishes a new post; resets every surface that lists posts. */
export interface CreatePostBody {
  text: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  tags?: string[];
}

export function useSubmitPost() {
  const queryClient = useQueryClient();

  return useMutation<Post, Error, CreatePostBody>({
    mutationFn: (body) => post<Post>("/posts", body),
    onSuccess: () => {
      toast.success("Posted");
      invalidatePostQueries(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not publish your post")),
  });
}

/** Inline edit of the post text. */
export function useUpdatePost() {
  return useOptimisticPostMutation<{ id: string; text: string }, Post>({
    mutationFn: (variables) => patch<Post>(`/posts/${variables.id}`, { text: variables.text }),
    select: (variables) => (cached) =>
      cached._id === variables.id ? { ...cached, text: variables.text } : cached,
    successMessage: "Post updated",
  });
}

/** Owner-only delete. */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => del<void>(`/posts/${id}`),
    onSuccess: () => {
      toast.success("Post deleted");
      invalidatePostQueries(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete that post")),
  });
}

/** Appends a reply optimistically, then lets the refetch confirm it. */
export function useAddReply() {
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.user);

  return useMutation<Reply, Error, { postId: string; text: string }, PostMutationContext>({
    mutationFn: ({ postId, text }) => post<Reply>(`/posts/${postId}/replies`, { text }),
    onMutate: async ({ postId, text }) => {
      await queryClient.cancelQueries();
      const snapshot = queryClient.getQueriesData<unknown>({});
      const author: CompactUser = {
        _id: me?._id ?? "",
        name: me?.name ?? "You",
        username: me?.username ?? "you",
        profilePic: me?.profilePic ?? "",
      };
      const optimistic: Reply = {
        _id: `local-reply-${Date.now()}`,
        user: author,
        text,
        createdAt: new Date().toISOString(),
      };
      writeSnapshot(queryClient, snapshot, (cached) =>
        cached._id === postId
          ? {
              ...cached,
              replies: [...(cached.replies ?? []), optimistic],
              repliesCount: (cached.repliesCount ?? 0) + 1,
            }
          : cached,
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshot);
      toast.error(errorMessage(error, "Could not send your reply"));
    },
    onSettled: () => invalidatePostQueries(queryClient),
  });
}

/* ------------------------------------------------------------------ *
 * Media helpers (shared by the composer and the story creator)
 * ------------------------------------------------------------------ */

export interface AttachedMedia {
  url: string;
  mediaType: MediaType;
}

/** Files bigger than this go through the multipart endpoint when possible. */
const INLINE_UPLOAD_THRESHOLD = 1_000_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads large files to `POST /media/upload`; everything else (or any
 * upload failure) falls back to an inline data URL so composing never blocks.
 */
export async function resolveMedia(file: File): Promise<AttachedMedia> {
  const mediaType: MediaType = file.type.startsWith("video") ? "video" : "image";

  if (file.size > INLINE_UPLOAD_THRESHOLD) {
    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await post<{ url: string }>("/media/upload", form, {
        // Dropping the JSON default lets the browser set the multipart boundary.
        headers: { "Content-Type": null },
      });
      return { url: uploaded.url, mediaType };
    } catch {
      /* upload refused (size/network) — inline it instead */
    }
  }

  const url = await readAsDataUrl(file);
  return { url, mediaType };
}

/** Reads a video's duration in seconds (0 when it cannot be determined). */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("video");
    const finish = (duration: number) => {
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    probe.preload = "metadata";
    probe.onloadedmetadata = () => finish(probe.duration);
    probe.onerror = () => finish(0);
    probe.src = objectUrl;
  });
}
