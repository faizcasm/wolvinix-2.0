import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { Calendar, Compass, MessageSquareText, Plus, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CenteredSpinner, EmptyState, PostSkeleton } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Modal";
import { errorMessage, get } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { formatCount } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { flattenPages, usePaginatedList } from "@/features/shared/usePaginatedList";
import { useCreatePost } from "@/features/posts/CreatePostContext";
import { PostCard } from "@/features/posts/PostCard";
import {
  Achievements,
  FollowersModal,
  ProfileHeader,
  StatsPanel,
  displayBadges,
  isNotFoundError,
  profileCounts,
  type ProfileUser,
} from "@/features/profile";
import type { Page } from "@/features/shared/usePaginatedList";
import type { Post } from "@/types";

type TabId = "posts" | "tagged" | "about";

interface ListQuery {
  data?: { pages: Page<Post>[] };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

/* ------------------------------- Post list -------------------------------- */

function PostList({
  list,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  list: ListQuery;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sentinelRef, { margin: "200px" });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (list.isLoading) {
    return (
      <div className="space-y-4">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (list.isError) {
    return (
      <EmptyState
        icon={<MessageSquareText className="h-6 w-6" aria-hidden="true" />}
        title="Couldn't load posts"
        description={errorMessage(list.error, "Something went wrong")}
        action={
          <Button variant="outline" size="sm" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const posts = flattenPages(list.data?.pages);

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquareText className="h-6 w-6" aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <PostCard key={post._id} post={post} index={index} />
      ))}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          loading={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ About panel ------------------------------- */

function AboutPanel({ profile }: { profile: ProfileUser }) {
  const counts = profileCounts(profile);
  const badges = displayBadges(profile);
  const joined = new Date(profile.createdAt);
  const joinedLabel = Number.isNaN(joined.getTime())
    ? ""
    : joined.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const summary = [
    { label: "Posts", value: formatCount(counts.posts) },
    { label: "Followers", value: formatCount(counts.followers) },
    { label: "Following", value: formatCount(counts.following) },
    { label: "Clans", value: formatCount(profile.clans?.length ?? 0) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="card p-4 sm:p-5">
        <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
          Bio
        </h2>
        <p className="text-muted mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {profile.bio?.trim() || "This player hasn't written a bio yet."}
        </p>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
          Badges
        </h2>
        {badges.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li
                key={badge.key}
                className="border-border bg-surface-2 text-muted rounded-full border px-3 py-1 text-xs font-medium"
              >
                {badge.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-subtle mt-2 text-sm">
            No badges yet — hit 1,000 followers to earn Verified.
          </p>
        )}
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
          Stats summary
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summary.map((entry) => (
            <div
              key={entry.label}
              className="border-border bg-surface-2 rounded-xl border p-3 text-center"
            >
              <dt className="text-subtle text-[11px]">{entry.label}</dt>
              <dd className="font-display tabular text-lg font-bold">{entry.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {joinedLabel && (
        <p className="text-subtle flex items-center gap-2 px-1 text-xs">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          Joined {joinedLabel}
        </p>
      )}
    </motion.div>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function ProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const { open: openCompose } = useCreatePost();

  const [tab, setTab] = useState<TabId>("posts");
  const [statsOpen, setStatsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [followersModal, setFollowersModal] = useState<{
    open: boolean;
    initialTab: "followers" | "following";
  }>({ open: false, initialTab: "followers" });

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: () => get<ProfileUser>(`/users/${encodeURIComponent(username)}`),
    enabled: Boolean(username),
  });

  const posts = usePaginatedList<Post>({
    queryKey: queryKeys.userPosts(username, "posts", 1),
    url: `/posts/user/${encodeURIComponent(username)}`,
    limit: 10,
    enabled: Boolean(username) && profileQuery.isSuccess && tab === "posts",
  });

  const tagged = usePaginatedList<Post>({
    queryKey: queryKeys.userPosts(username, "tagged", 1),
    url: `/posts/tagged/${encodeURIComponent(username)}`,
    limit: 10,
    enabled: Boolean(username) && profileQuery.isSuccess && tab === "tagged",
  });

  const profile = profileQuery.data;
  const isOwn = Boolean(profile && me && profile._id === me._id);
  const isFollowing = Boolean(profile && me?.following?.includes(profile._id));

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <CenteredSpinner label="Loading profile" />
      </div>
    );
  }

  if (profileQuery.isError && isNotFoundError(profileQuery.error)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="bg-danger-soft text-danger flex h-16 w-16 items-center justify-center rounded-2xl"
        >
          <UserX className="h-8 w-8" aria-hidden="true" />
        </motion.div>
        <h1 className="font-display mt-5 text-2xl font-bold">Player not found</h1>
        <p className="text-muted mt-2 max-w-sm text-sm">
          @{username} doesn't exist on Wolvinix — the handle may have changed or the account was
          removed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.history.back()}>Go back</Button>
          <Button
            variant="outline"
            onClick={() => navigate("/explore")}
            leftIcon={<Compass className="h-4 w-4" aria-hidden="true" />}
          >
            Explore players
          </Button>
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-bold">Couldn't load this profile</h1>
        <p className="text-muted mt-2 max-w-sm text-sm">
          {errorMessage(profileQuery.error, "Something went wrong")}
        </p>
        <Button className="mt-5" variant="outline" onClick={() => profileQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const counts = profileCounts(profile);

  return (
    <div className="space-y-5">
      <ProfileHeader
        profile={profile}
        isOwn={isOwn}
        isFollowing={isFollowing}
        onFollowers={() => setFollowersModal({ open: true, initialTab: "followers" })}
        onFollowing={() => setFollowersModal({ open: true, initialTab: "following" })}
        onOpenStats={() => setStatsOpen(true)}
        onOpenAchievements={() => setAchievementsOpen(true)}
      />

      <Tabs
        value={tab}
        onChange={(next) => setTab(next as TabId)}
        items={[
          { id: "posts", label: "Posts", count: counts.posts || undefined },
          { id: "tagged", label: "Tagged" },
          { id: "about", label: "About" },
        ]}
      />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "posts" && (
          <PostList
            list={posts}
            emptyTitle={isOwn ? "Your feed starts here" : `@${profile.username} is quiet`}
            emptyDescription={
              isOwn
                ? "Share a clip, a build, or a hot take — your pack is waiting."
                : "No posts yet. Check back soon."
            }
            emptyAction={
              isOwn ? (
                <Button
                  leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  onClick={openCompose}
                >
                  Create your first post
                </Button>
              ) : undefined
            }
          />
        )}

        {tab === "tagged" && (
          <PostList
            list={tagged}
            emptyTitle="Nothing tagged yet"
            emptyDescription={`Posts that tag @${profile.username} will appear here.`}
          />
        )}

        {tab === "about" && <AboutPanel profile={profile} />}
      </motion.div>

      <StatsPanel
        userId={profile._id}
        username={profile.username}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
      />

      <FollowersModal
        userId={profile._id}
        username={profile.username}
        open={followersModal.open}
        initialTab={followersModal.initialTab}
        onClose={() => setFollowersModal((state) => ({ ...state, open: false }))}
      />

      <Achievements
        profile={profile}
        postCount={counts.posts}
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
      />
    </div>
  );
}
