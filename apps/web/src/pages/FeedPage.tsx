import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar, EmptyState, PostSkeleton } from "@/components/ui/Card";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { useCreatePost } from "@/features/posts/CreatePostContext";
import { PostCard } from "@/features/posts/PostCard";
import { useFeed } from "@/features/posts/hooks";
import { StoriesRail } from "@/features/stories/StoriesRail";
import { useAuthStore } from "@/stores/auth";
import type { Post } from "@/types";

/** Home feed: stories, composer entry and an infinite list of posts. */
export default function FeedPage() {
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const { open } = useCreatePost();
  const feed = useFeed();

  const posts = flattenPages<Post>(feed.data?.pages);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasNext = feed.hasNextPage;
  const fetchingNext = feed.isFetchingNextPage;
  const fetchNext = feed.fetchNextPage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNext || fetchingNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNext();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, fetchingNext, fetchNext]);

  const loading = feed.isLoading;
  const failed = feed.isError && posts.length === 0;
  const empty = !loading && !failed && posts.length === 0;
  const firstName = (me?.name ?? "there").split(" ")[0];

  return (
    <div className="space-y-4">
      <StoriesRail />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Home</h1>
        <IconButton label="Refresh feed" onClick={() => feed.refetch()}>
          <RefreshCw className={feed.isRefetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </IconButton>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex items-center gap-3 p-4"
      >
        <Avatar src={me?.profilePic} name={me?.name} size="md" />
        <button
          type="button"
          onClick={open}
          className="border-border bg-surface-2 text-subtle hover:border-brand-500/40 hover:text-muted min-w-0 flex-1 truncate rounded-full border px-4 py-2.5 text-left text-sm transition-colors"
        >
          What's happening, {firstName}?
        </button>
        <Button
          size="sm"
          variant="gradient"
          onClick={open}
          leftIcon={<Plus className="h-4 w-4" />}
          className="hidden shrink-0 sm:inline-flex"
        >
          Post
        </Button>
      </motion.div>

      {loading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your feed">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {failed && (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <span className="bg-danger-soft text-danger flex h-12 w-12 items-center justify-center rounded-2xl">
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display font-semibold">Your feed took a hit</p>
            <p className="text-muted mt-1 text-sm">We couldn't reach the server just then.</p>
          </div>
          <Button variant="outline" onClick={() => feed.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {empty && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Your pack is quiet"
          description="Follow a few players or see what the community is posting right now."
          action={
            <Button variant="gradient" onClick={() => navigate("/explore")}>
              Explore what's trending
            </Button>
          }
        />
      )}

      {posts.map((post, index) => (
        <PostCard key={post._id} post={post} index={index} />
      ))}

      {hasNext && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" loading={fetchingNext} onClick={() => fetchNext()}>
            Load more
          </Button>
        </div>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      {!hasNext && posts.length > 0 && (
        <p className="text-subtle pb-2 text-center text-xs">You're all caught up 🐺</p>
      )}
    </div>
  );
}
