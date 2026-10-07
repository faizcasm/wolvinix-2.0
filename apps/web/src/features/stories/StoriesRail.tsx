import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Avatar, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { StoriesResponse, StoryGroup } from "@/types";
import { CreateStory } from "./CreateStory";
import { StoryViewer } from "./StoryViewer";

/**
 * Horizontal snap-scroll rail above the feed: your story first, then the
 * groups you follow — gradient ring for unseen, dimmed for seen.
 */
export function StoriesRail() {
  const me = useAuthStore((state) => state.user);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<StoriesResponse, Error>({
    queryKey: queryKeys.stories,
    queryFn: () => get<StoriesResponse>("/stories"),
    staleTime: 30_000,
  });

  const groups: StoryGroup[] = useMemo(() => {
    const mine = data?.mine ?? [];
    const own: StoryGroup[] = mine.length > 0 ? [{ user: mine[0].user, stories: mine }] : [];
    return [...own, ...(data?.groups ?? [])];
  }, [data]);

  if (isLoading) {
    return (
      <div className="card p-3" aria-busy="true">
        <div className="flex scrollbar-none gap-3 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="shrink-0 text-center">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="mx-auto mt-2 h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-muted text-sm">Stories couldn't be loaded right now.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const mine = data?.mine ?? [];
  const hasMine = mine.length > 0;
  const mineSeen = hasMine && mine.every((story) => story.seenByMe);

  return (
    <>
      <div className="card p-3">
        <div
          className="flex snap-x snap-mandatory scrollbar-none gap-3 overflow-x-auto"
          role="list"
          aria-label="Stories"
        >
          <div className="relative shrink-0 snap-start" role="listitem">
            <button
              type="button"
              onClick={() => (hasMine ? setViewing(0) : setCreating(true))}
              aria-label={hasMine ? "Open your story" : "Add to your story"}
              className="flex w-16 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "rounded-full p-[3px]",
                  hasMine && !mineSeen
                    ? "from-brand-500 via-accent to-lime bg-gradient-to-br"
                    : "bg-surface-3",
                )}
              >
                <span className="bg-surface block rounded-full p-0.5">
                  <Avatar
                    size="lg"
                    src={me?.profilePic}
                    name={me?.name}
                    className={cn(hasMine && mineSeen && "opacity-60")}
                  />
                </span>
              </span>
              <span className="text-muted w-16 truncate text-[11px]">Your story</span>
            </button>

            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label="Add to your story"
              className="border-surface bg-brand-500 text-inverted absolute top-0 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-transform hover:scale-110"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {groups.map((group, index) => {
            const unseen = group.stories.some((story) => !story.seenByMe);
            return (
              <div key={group.user._id} role="listitem" className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setViewing(index)}
                  aria-label={`Open ${group.user.name}'s story`}
                  className="flex w-16 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "rounded-full p-[3px]",
                      unseen
                        ? "from-brand-500 via-accent to-lime bg-gradient-to-br"
                        : "bg-surface-3",
                    )}
                  >
                    <span className="bg-surface block rounded-full p-0.5">
                      <Avatar
                        size="lg"
                        src={group.user.profilePic}
                        name={group.user.name}
                        className={cn(unseen ? "" : "opacity-60")}
                      />
                    </span>
                  </span>
                  <span className="text-muted w-16 truncate text-[11px]">
                    {group.user.name.split(" ")[0]}
                  </span>
                </button>
              </div>
            );
          })}

          {groups.length === 0 && (
            <p className="text-subtle flex shrink-0 items-center px-2 text-xs">
              Follow more players to see their stories here.
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {viewing !== null && (
          <StoryViewer groups={groups} initialIndex={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>

      <CreateStory open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

export default StoriesRail;
