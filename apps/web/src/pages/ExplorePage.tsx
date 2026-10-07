import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Hash, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PostSkeleton, Skeleton } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Modal";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { PostCard } from "@/features/posts/PostCard";
import { useExplore, useTrendingHashtags } from "@/features/posts/hooks";
import { formatCount } from "@/lib/utils";
import type { Post } from "@/types";

const TABS = [
  { id: "trending", label: "Trending" },
  { id: "recent", label: "Recent" },
];

/** Community-wide discovery: trending hashtags + a responsive post grid. */
export default function ExplorePage() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState("trending");

  const explore = useExplore();
  const trends = useTrendingHashtags();

  const posts = flattenPages<Post>(explore.data?.pages);
  const ordered =
    tab === "recent"
      ? [...posts].sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
      : posts;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasNext = explore.hasNextPage;
  const fetchingNext = explore.isFetchingNextPage;
  const fetchNext = explore.fetchNextPage;

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

  const loading = explore.isLoading;
  const failed = explore.isError && posts.length === 0;
  const empty = !loading && !failed && posts.length === 0;
  const hashtagList = trends.data ?? [];

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold">Explore</h1>
        <p className="text-muted text-sm">What the whole community is playing and talking about.</p>
      </header>

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {trends.isLoading && (
        <div className="flex scrollbar-none gap-2 overflow-x-auto" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
      )}

      {trends.isError && (
        <div className="border-border bg-surface-2 text-muted flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
          <span>Trending tags are unavailable.</span>
          <Button size="sm" variant="ghost" onClick={() => trends.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!trends.isLoading && hashtagList.length > 0 && (
        <div className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
          {hashtagList.map((trend) => (
            <Link
              key={trend.tag}
              to={`/hashtag/${trend.tag}`}
              className="border-border bg-surface-2 hover:border-brand-500/50 hover:text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
            >
              <Hash className="text-accent h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium">#{trend.tag}</span>
              <span className="tabular text-subtle text-xs">{formatCount(trend.count)}</span>
            </Link>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
          <PostSkeleton />
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
            <p className="font-display font-semibold">Explore didn't load</p>
            <p className="text-muted mt-1 text-sm">The server didn't answer in time.</p>
          </div>
          <Button variant="outline" onClick={() => explore.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {empty && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Nothing trending yet"
          description="Be the spark — post something and it may land here."
        />
      )}

      {!loading && !failed && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ordered.map((post, index) => (
            <motion.div
              key={post._id}
              whileHover={reduced ? undefined : { y: -4 }}
              whileTap={reduced ? undefined : { scale: 0.99 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="h-full"
            >
              <PostCard post={post} index={index} />
            </motion.div>
          ))}
        </div>
      )}

      {hasNext && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" loading={fetchingNext} onClick={() => fetchNext()}>
            Load more
          </Button>
        </div>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
    </div>
  );
}
