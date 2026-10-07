import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import { Users } from "lucide-react";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, Tabs } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { flattenPages, usePaginatedList } from "@/features/shared/usePaginatedList";
import { FollowButton } from "./FollowButton";
import type { CompactUser } from "@/types";

type ListTab = "followers" | "following";

interface FollowersModalProps {
  userId: string;
  username: string;
  open: boolean;
  onClose: () => void;
  initialTab?: ListTab;
}

/** Paginated followers / following list with optimistic follow per row. */
export function FollowersModal({
  userId,
  username,
  open,
  onClose,
  initialTab = "followers",
}: FollowersModalProps) {
  const [tab, setTab] = useState<ListTab>(initialTab);
  const me = useAuthStore((state) => state.user);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sentinelInView = useInView(sentinelRef, { margin: "160px" });

  const list = usePaginatedList<CompactUser>({
    queryKey: queryKeys.followers(userId, tab),
    url: `/users/${userId}/${tab}`,
    limit: 12,
    enabled: open && Boolean(userId),
  });

  const users = flattenPages(list.data?.pages);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  useEffect(() => {
    if (sentinelInView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [sentinelInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const rows = list.isLoading ? null : list.isError ? null : users;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`@${username}`}
      description={
        tab === "followers" ? "People following this player" : "Players this account follows"
      }
    >
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(next) => setTab(next as ListTab)}
        items={[
          { id: "followers", label: "Followers" },
          { id: "following", label: "Following" },
        ]}
      />

      {list.isLoading && (
        <ul className="space-y-2" aria-label="Loading">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} className="border-border flex items-center gap-3 rounded-xl border p-2.5">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-24" />
            </li>
          ))}
        </ul>
      )}

      {list.isError && !list.isLoading && (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title="Couldn't load this list"
          description={errorMessage(list.error, "Something went wrong")}
          action={
            <Button variant="outline" size="sm" onClick={() => list.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {rows && rows.length === 0 && (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title={tab === "followers" ? "No followers yet" : "Not following anyone"}
          description={
            tab === "followers"
              ? "When someone joins the pack, they'll show up here."
              : `When @${username} follows someone, they'll show up here.`
          }
        />
      )}

      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((person, index) => {
            const isSelf = me?._id === person._id;
            return (
              <li
                key={`${person._id}-${index}`}
                className="border-border bg-surface-2 hover:border-border-strong flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
              >
                <Avatar src={person.profilePic} name={person.name} size="md" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/profile/${person.username}`}
                    onClick={onClose}
                    className="hover:text-brand-500 block truncate text-sm font-semibold transition-colors"
                  >
                    {person.name}
                  </Link>
                  <p className="text-subtle truncate text-xs">@{person.username}</p>
                </div>
                {isSelf ? (
                  <Badge tone="brand">You</Badge>
                ) : (
                  <FollowButton
                    userId={person._id}
                    initialFollowing={me?.following?.includes(person._id) ?? false}
                    size="sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      {hasNextPage && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          loading={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </Modal>
  );
}

export default FollowersModal;
