import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PostSkeleton } from "@/components/ui/Card";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { PostCard } from "@/features/posts/PostCard";
import { useBookmarks } from "@/features/posts/hooks";
import type { Post } from "@/types";

/** Everything the signed-in player has saved. */
export default function BookmarksPage() {
  const navigate = useNavigate();
  const bookmarks = useBookmarks();

  const posts = flattenPages<Post>(bookmarks.data?.pages);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasNext = bookmarks.hasNextPage;
  const fetchingNext = bookmarks.isFetchingNextPage;
  const fetchNext = bookmarks.fetchNextPage;

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

  const loading = bookmarks.isLoading;
  const failed = bookmarks.isError && posts.length === 0;
  const empty = !loading && !failed && posts.length === 0;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold">Bookmarks</h1>
        <p className="text-muted text-sm">Posts you saved to come back to later.</p>
      </header>

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
            <p className="font-display font-semibold">Couldn't load your saves</p>
            <p className="text-muted mt-1 text-sm">Check your connection and try once more.</p>
          </div>
          <Button variant="outline" onClick={() => bookmarks.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {empty && (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="Nothing saved yet"
          description="Tap the bookmark on any post to keep it here for later."
          action={
            <Button variant="gradient" onClick={() => navigate("/explore")}>
              Find posts to save
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
