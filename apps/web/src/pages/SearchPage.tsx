import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Clock,
  RotateCw,
  Search as SearchIcon,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { truncate } from "@/lib/utils";
import { Avatar, EmptyState, PostSkeleton, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Modal";
import { PostCard } from "@/features/posts/PostCard";
import { ClanSearchRow } from "@/features/clans/ClanCard";
import { useClans } from "@/features/clans/hooks";
import { flattenPages, usePaginatedList } from "@/features/shared/usePaginatedList";
import type { Clan, CompactUser, Post, User } from "@/types";

type TabId = "people" | "posts" | "clans";

const RECENT_KEY = "wolvinix.recent-searches";
const RECENT_LIMIT = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function writeRecent(entries: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable — recents simply don't persist this session */
  }
}

function RowSkeleton() {
  return (
    <li className="border-border flex items-center gap-3 rounded-xl border p-3.5">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-52 max-w-full" />
      </div>
    </li>
  );
}

function PeopleRow({ user, index }: { user: CompactUser; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
        delay: Math.min(index, 8) * 0.05,
      }}
      className="border-border bg-surface hover:border-brand-500/40 relative overflow-hidden rounded-xl border transition-colors"
    >
      <div className="flex items-center gap-3 p-3.5">
        <Avatar src={user.profilePic} name={user.name} size="md" online />
        <div className="min-w-0 flex-1">
          <Link
            to={`/profile/${user.username}`}
            className="hover:text-brand-500 block truncate text-sm font-semibold"
          >
            {user.name}
          </Link>
          <p className="text-subtle truncate text-xs">@{user.username}</p>
          {user.bio && (
            <p className="text-muted mt-0.5 line-clamp-2 text-xs">{truncate(user.bio, 120)}</p>
          )}
        </div>
        <Link
          to={`/profile/${user.username}`}
          className="border-border hover:border-brand-500/50 hover:bg-surface-2 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          View
        </Link>
      </div>
    </motion.li>
  );
}

/** `/search` — debounced, tabbed, URL-synced search across the network. */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();

  const initialTerm = searchParams.get("q") ?? "";
  const [term, setTerm] = useState(initialTerm);
  const [query, setQuery] = useState(initialTerm);
  const [tab, setTab] = useState<TabId>("people");
  const [recent, setRecent] = useState<string[]>(readRecent);

  /* 300ms debounce before anything hits the network */
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(term.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  /* write the settled query back into the URL so results are linkable */
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (current === query) return;
    const next = new URLSearchParams(searchParams);
    if (query) next.set("q", query);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }, [query, searchParams, setSearchParams]);

  const remember = useCallback((value: string) => {
    const entry = value.trim();
    if (!entry) return;
    setRecent((current) => {
      const next = [entry, ...current.filter((item) => item !== entry)].slice(0, RECENT_LIMIT);
      writeRecent(next);
      return next;
    });
  }, []);

  const submit = () => {
    setQuery(term.trim());
    remember(term);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") submit();
  };

  const hasQuery = query.length > 0;

  const people = usePaginatedList<User>({
    queryKey: queryKeys.search(query, 1),
    url: "/users/search",
    params: { q: query },
    limit: 10,
    enabled: hasQuery && tab === "people",
  });

  const posts = usePaginatedList<Post>({
    queryKey: ["search-posts", query, 1],
    url: "/posts/explore",
    params: { q: query },
    limit: 10,
    enabled: hasQuery && tab === "posts",
  });

  const clans = useClans(hasQuery ? query : "", hasQuery && tab === "clans");
  const clanResults = useMemo(() => flattenPages(clans.data?.pages), [clans.data]);

  const suggested = useQuery<CompactUser[]>({
    queryKey: queryKeys.suggested,
    queryFn: async () => await get<CompactUser[]>("/users/suggested"),
    enabled: !hasQuery,
    staleTime: 60_000,
  });

  const peopleResults = useMemo(() => flattenPages(people.data?.pages), [people.data]);
  const postResults = useMemo(() => flattenPages(posts.data?.pages), [posts.data]);

  const tabs = [
    { id: "people", label: "People", count: peopleResults.length },
    { id: "posts", label: "Posts", count: postResults.length },
    { id: "clans", label: "Clans", count: clanResults.length },
  ];

  const pageInfo =
    tab === "people"
      ? {
          has: people.hasNextPage,
          fetching: people.isFetchingNextPage,
          more: () => void people.fetchNextPage(),
          count: peopleResults.length,
        }
      : tab === "posts"
        ? {
            has: posts.hasNextPage,
            fetching: posts.isFetchingNextPage,
            more: () => void posts.fetchNextPage(),
            count: postResults.length,
          }
        : {
            has: clans.hasNextPage,
            fetching: clans.isFetchingNextPage,
            more: () => void clans.fetchNextPage(),
            count: clanResults.length,
          };

  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Search</h1>
          <p className="text-muted text-sm">Hunt down players, posts and clans across Wolvinix.</p>
        </div>

        <div className="relative">
          <SearchIcon
            className="text-subtle pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search people, posts or clans…"
            aria-label="Search Wolvinix"
            autoFocus
            className="border-border bg-surface placeholder:text-subtle hover:border-border-strong focus:border-brand-500 h-12 w-full rounded-2xl border pr-24 pl-12 text-base transition-colors outline-none"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
            {term && (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  setQuery("");
                }}
                aria-label="Clear search"
                className="text-subtle hover:bg-surface-2 hover:text-foreground rounded-lg p-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button size="sm" variant="primary" onClick={submit}>
              Search
            </Button>
          </div>
        </div>

        <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />
      </header>

      {!hasQuery ? (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {recent.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-subtle flex items-center gap-2 text-sm font-semibold tracking-widest uppercase">
                  <Clock className="h-4 w-4" aria-hidden="true" /> Recent searches
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    writeRecent([]);
                  }}
                  className="text-subtle hover:text-danger text-xs transition-colors"
                >
                  Clear history
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setTerm(entry);
                      setQuery(entry);
                      remember(entry);
                    }}
                    className="border-border bg-surface-2 hover:border-brand-500/50 rounded-full border px-3.5 py-1.5 text-sm transition-colors"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-display text-subtle flex items-center gap-2 text-sm font-semibold tracking-widest uppercase">
              <TrendingUp className="h-4 w-4" aria-hidden="true" /> Who to follow
            </h2>

            {suggested.isLoading ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <RowSkeleton key={index} />
                ))}
              </ul>
            ) : (suggested.data ?? []).length === 0 ? (
              <EmptyState
                icon={<UserRound className="h-6 w-6" />}
                title="No suggestions right now"
                description="Follow a few players and we'll learn what to recommend."
              />
            ) : (
              <motion.div
                className="grid gap-3 sm:grid-cols-2"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.06,
                    },
                  },
                }}
              >
                {(suggested.data ?? []).map((person, index) => (
                  <motion.div
                    key={person._id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <PeopleRow user={person} index={index} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {tab === "people" &&
              (people.isLoading ? (
                <ul className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <RowSkeleton key={index} />
                  ))}
                </ul>
              ) : people.isError ? (
                <SearchError onRetry={() => void people.refetch()} />
              ) : peopleResults.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title={`No people match “${query}”`}
                  description="Check the spelling, or try a username instead of a display name."
                />
              ) : (
                <ul className="space-y-2">
                  {peopleResults.map((person, index) => (
                    <PeopleRow key={person._id} user={person} index={index} />
                  ))}
                </ul>
              ))}

            {tab === "posts" &&
              (posts.isLoading ? (
                <div className="space-y-4">
                  <PostSkeleton />
                  <PostSkeleton />
                </div>
              ) : posts.isError ? (
                <SearchError onRetry={() => void posts.refetch()} />
              ) : postResults.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon className="h-6 w-6" />}
                  title={`No posts match “${query}”`}
                  description="Try fewer words — search looks at post text and hashtags."
                />
              ) : (
                <div className="space-y-4">
                  {postResults.map((post, index) => (
                    <PostCard key={post._id} post={post} highlight={query} index={index} />
                  ))}
                </div>
              ))}

            {tab === "clans" &&
              (clans.isLoading ? (
                <ul className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <RowSkeleton key={index} />
                  ))}
                </ul>
              ) : clans.isError ? (
                <SearchError onRetry={() => void clans.refetch()} />
              ) : clanResults.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title={`No clans match “${query}”`}
                  description="Clan names and mottos are searched — try a shorter word."
                />
              ) : (
                <ul className="space-y-2">
                  {clanResults.map((clan: Clan) => (
                    <ClanSearchRow key={clan._id} clan={clan} />
                  ))}
                </ul>
              ))}

            <div className="flex justify-center pt-2">
              {pageInfo.has ? (
                <Button variant="outline" loading={pageInfo.fetching} onClick={pageInfo.more}>
                  Load more results
                </Button>
              ) : (
                <span className="text-subtle text-xs">
                  {pageInfo.count} result
                  {pageInfo.count === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function SearchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center">
      <RotateCw className="text-danger h-8 w-8" aria-hidden="true" />
      <p className="text-muted text-sm">Search failed — the server didn't answer.</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
