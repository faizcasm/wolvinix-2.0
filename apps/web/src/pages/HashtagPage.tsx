import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Hash, PenLine, TriangleAlert } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState, PostSkeleton } from "@/components/ui/Card";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { useCreatePost } from "@/features/posts/CreatePostContext";
import { PostCard } from "@/features/posts/PostCard";
import { useHashtagFeed, useTrendingHashtags } from "@/features/posts/hooks";
import { formatCount } from "@/lib/utils";
import type { Post } from "@/types";

/** All posts carrying one tag, plus a quick way to join the conversation. */
export default function HashtagPage() {
  const { tag = "" } = useParams();
  const navigate = useNavigate();
  const { openWithSeed } = useCreatePost();

  const trends = useTrendingHashtags();
  const feed = useHashtagFeed(tag);

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

  const total = feed.data?.pages[0]?.meta?.total;
  const trendCount = trends.data?.find(
    (item) => item.tag.toLowerCase() === tag.toLowerCase(),
  )?.count;
  const count = total ?? trendCount ?? posts.length;

  const loading = feed.isLoading;
  const failed = feed.isError && posts.length === 0;
  const empty = !loading && !failed && posts.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconButton label="Go back" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <span className="bg-accent-soft text-accent flex h-10 w-10 items-center justify-center rounded-xl">
          <Hash className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-xl font-bold">#{tag}</h1>
          <p className="text-subtle tabular text-xs">{formatCount(count)} posts</p>
        </div>
        <Button
          size="sm"
          variant="gradient"
          leftIcon={<PenLine className="h-4 w-4" />}
          onClick={() => openWithSeed(`#${tag} `)}
        >
          Post
        </Button>
      </div>

      {loading && (
        <div className="space-y-4" aria-busy="true">
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
            <p className="font-display font-semibold">This tag didn't load</p>
            <p className="text-muted mt-1 text-sm">The server didn't answer in time.</p>
          </div>
          <Button variant="outline" onClick={() => feed.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {empty && (
        <EmptyState
          icon={<Hash className="h-6 w-6" />}
          title={`No posts with #${tag} yet`}
          description="Start the tag off — share what you're playing."
          action={
            <Button variant="gradient" onClick={() => openWithSeed(`#${tag} `)}>
              Create post with this tag
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
    </div>
  );
}
