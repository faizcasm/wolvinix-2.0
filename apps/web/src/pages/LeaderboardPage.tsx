import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Gamepad2, Medal, RotateCw, Trophy, Users } from "lucide-react";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Modal";
import { flattenPages, usePaginatedList } from "@/features/shared/usePaginatedList";
import type { CompactUser } from "@/types";

type Period = "all" | "month";

/**
 * `/stats/leaderboard` has shipped two shapes: the contract documents
 * `{ games: number, topGame: string }` while the current server aggregates
 * distinct titles into `games: string[]` (+ `entries`). Both are normalised
 * into `LeaderRow` so neither payload can break the page.
 */
interface RawEntry {
  user?: CompactUser | null;
  totalScore?: number;
  entries?: number;
  games?: string[] | number;
  topGame?: string;
}

interface LeaderRow {
  id: string;
  user: CompactUser;
  hasProfile: boolean;
  totalScore: number;
  games: number;
  topGame: string;
}

function normalizeRows(entries: RawEntry[]): LeaderRow[] {
  return entries.map((entry, index) => {
    const titles = Array.isArray(entry.games)
      ? entry.games.filter((title): title is string => typeof title === "string")
      : [];
    const games = Array.isArray(entry.games)
      ? titles.length
      : Number(entry.games ?? entry.entries ?? 0);
    const user = entry.user ?? null;

    return {
      id: user?._id ?? `unclaimed-${index}`,
      user: user ?? { _id: "", name: "Departed player", username: "", profilePic: "" },
      hasProfile: Boolean(user?.username),
      totalScore: Number(entry.totalScore ?? 0),
      games: Number.isFinite(games) ? games : 0,
      topGame: entry.topGame ?? titles[0] ?? "—",
    };
  });
}

/** Medal accents — gold, silver, bronze, expressed with semantic tokens. */
const PLACE_TONE = [
  "border-warning/40 bg-warning/15 text-warning",
  "border-border-strong bg-surface-3 text-muted",
  "border-accent/40 bg-accent/15 text-accent",
];

const ROW_COLUMNS =
  "grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 " +
  "sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_3.5rem_7rem] sm:gap-x-4";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const rowItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
} as const;

/* ------------------------------- Podium ------------------------------- */

function PodiumCard({
  row,
  place,
  isMe,
  delay,
  reduceMotion,
}: {
  row: LeaderRow;
  place: number;
  isMe: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  const isFirst = place === 1;

  const body = (
    <div
      className={cn(
        "bg-surface flex w-full flex-col items-center gap-1 rounded-[0.9rem] px-2 py-4 text-center",
        isFirst && "px-3 py-5",
      )}
    >
      {isFirst && (
        <span className="border-warning/40 bg-warning/15 text-warning mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
          <Crown className="h-3 w-3" aria-hidden="true" /> Champion
        </span>
      )}

      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold tabular-nums",
          PLACE_TONE[place - 1],
        )}
        aria-label={`${place}${place === 1 ? "st" : place === 2 ? "nd" : "rd"} place`}
      >
        {place}
      </span>

      <Avatar
        src={row.user.profilePic}
        name={row.user.name}
        size={isFirst ? "lg" : "md"}
        ring={isFirst}
        className="my-1.5"
      />

      <div className="w-full min-w-0">
        {row.hasProfile ? (
          <Link
            to={`/profile/${row.user.username}`}
            className="hover:text-brand-500 block truncate text-xs font-semibold transition-colors sm:text-sm"
          >
            {row.user.name}
          </Link>
        ) : (
          <p className="truncate text-xs font-semibold sm:text-sm">{row.user.name}</p>
        )}
        {row.hasProfile && <p className="text-subtle truncate text-[11px]">@{row.user.username}</p>}
      </div>

      <p
        className={cn(
          "font-display font-bold tabular-nums",
          isFirst ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
        )}
      >
        {row.totalScore.toLocaleString()}
        <span className="text-subtle ml-1 text-[10px] font-medium">pts</span>
      </p>

      <p className="text-subtle flex items-center gap-1 text-[11px]">
        <Medal className="h-3 w-3 shrink-0" aria-hidden="true" />
        {row.games} {row.games === 1 ? "game" : "games"}
      </p>

      {isMe && (
        <Badge tone="brand" className="mt-1">
          You
        </Badge>
      )}
    </div>
  );

  return (
    <motion.div
      className={cn("min-w-0 flex-1", isFirst && "mb-4 sm:mb-9")}
      initial={{ opacity: 0, y: reduceMotion ? 0 : isFirst ? 48 : 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 230, damping: 22, delay }
      }
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
      {isFirst ? (
        <div className="from-brand-500 via-accent to-lime rounded-2xl bg-gradient-to-b p-[2px] shadow-[0_18px_40px_-18px_var(--glow-brand)]">
          {body}
        </div>
      ) : (
        <div className="border-border bg-surface rounded-2xl border">{body}</div>
      )}
    </motion.div>
  );
}

function PodiumSkeleton({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl items-end justify-center gap-2 sm:gap-4"
      aria-hidden="true"
    >
      <div className="border-border bg-surface flex-1 rounded-2xl border p-3">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      <div
        className={cn(
          "border-border bg-surface flex-1 rounded-2xl border p-3",
          !reduceMotion && "mb-4 sm:mb-9",
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
      <div className="border-border bg-surface flex-1 rounded-2xl border p-3">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <li className={cn(ROW_COLUMNS, "border-border bg-surface rounded-xl border p-3")}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-40 max-w-full sm:hidden" />
      </div>
      <Skeleton className="hidden h-3.5 justify-self-end sm:block" />
      <Skeleton className="hidden h-3.5 sm:block" />
      <Skeleton className="hidden h-3.5 sm:block" />
    </li>
  );
}

/* -------------------------------- Page -------------------------------- */

/** `/leaderboard` — top-3 podium, ranked table and your own rank in lights. */
export default function LeaderboardPage() {
  const meId = useAuthStore((state) => state.user?._id ?? "");
  const reduceMotion = Boolean(useReducedMotion());
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("all");

  const list = usePaginatedList<RawEntry>({
    queryKey: queryKeys.leaderboard(1),
    url: "/stats/leaderboard",
    // Forwarded to the API so the board can be scoped server-side.
    params: { period },
    limit: 10,
  });

  const rows = useMemo(() => normalizeRows(flattenPages(list.data?.pages)), [list.data]);
  const total = list.data?.pages[0]?.meta?.total ?? null;
  const first = rows[0];

  const isLoading = list.isLoading;
  const showError = list.isError && rows.length === 0;
  const showEmpty = !isLoading && !showError && rows.length === 0;

  return (
    <div className="space-y-6 pb-4">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="noise border-border bg-surface relative overflow-hidden rounded-2xl border p-5 sm:p-7"
      >
        <span
          className="bg-brand-500/25 pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <span
          className="bg-accent/20 pointer-events-none absolute -bottom-24 left-8 h-48 w-48 rounded-full blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-warning/15 text-warning grid size-11 shrink-0 place-items-center rounded-2xl">
              <Trophy size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold sm:text-2xl">Leaderboard</h1>
              <p className="text-muted text-sm">
                {total != null
                  ? `${total.toLocaleString()} player${total === 1 ? "" : "s"} ranked — climb the board by logging stats.`
                  : "Top players ranked by total score across every game."}
              </p>
            </div>
          </div>

          <Tabs
            items={[
              { id: "all", label: "All time" },
              { id: "month", label: "This month" },
            ]}
            value={period}
            onChange={(id) => setPeriod(id as Period)}
            className="shrink-0 sm:w-56"
          />
        </div>
      </motion.header>

      {isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading leaderboard">
          <PodiumSkeleton reduceMotion={reduceMotion} />
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </ul>
        </div>
      ) : showError ? (
        <EmptyState
          icon={<RotateCw className="h-6 w-6" />}
          title="Couldn't load the leaderboard"
          description="The server didn't answer. Give it another shot."
          action={
            <Button variant="outline" onClick={() => void list.refetch()}>
              Retry
            </Button>
          }
        />
      ) : showEmpty ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="The board is wide open"
          description="Nobody has logged a score yet. Add stats from the games page and take rank #1."
          action={
            <Button variant="gradient" onClick={() => navigate("/games")}>
              Log your first score
            </Button>
          }
        />
      ) : (
        <>
          {list.isError && (
            <div
              role="alert"
              className="border-danger/40 bg-danger-soft flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            >
              <RotateCw className="text-danger h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-foreground min-w-0 flex-1">
                Couldn't refresh the board — showing the last known ranks.
              </p>
              <Button size="sm" variant="outline" onClick={() => void list.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {/* Podium: 2nd left, 1st centered + elevated, 3rd right */}
          <section aria-label="Top three players" aria-busy={list.isPlaceholderData}>
            <div className="mx-auto flex w-full max-w-2xl items-end justify-center gap-2 sm:gap-4">
              {rows[1] && (
                <PodiumCard
                  row={rows[1]}
                  place={2}
                  isMe={rows[1].user._id === meId}
                  delay={reduceMotion ? 0 : 0.12}
                  reduceMotion={reduceMotion}
                />
              )}
              {first && (
                <PodiumCard
                  row={first}
                  place={1}
                  isMe={first.user._id === meId}
                  delay={reduceMotion ? 0 : 0.22}
                  reduceMotion={reduceMotion}
                />
              )}
              {rows[2] && (
                <PodiumCard
                  row={rows[2]}
                  place={3}
                  isMe={rows[2].user._id === meId}
                  delay={reduceMotion ? 0 : 0.32}
                  reduceMotion={reduceMotion}
                />
              )}
            </div>
          </section>

          {/* Ranked table — collapses into cards below the sm breakpoint */}
          <section aria-label="Full rankings" className="space-y-2">
            <div
              className={cn(
                ROW_COLUMNS,
                "text-subtle hidden px-3 pb-1 text-[11px] font-semibold tracking-widest uppercase sm:grid",
              )}
            >
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              <span className="text-center">Games</span>
              <span>Best game</span>
            </div>

            <motion.ul variants={container} initial="hidden" animate="show" className="space-y-2">
              {rows.map((row, index) => {
                const rank = index + 1;
                const isMe = Boolean(meId) && row.user._id === meId;
                return (
                  <motion.li
                    key={`${row.id}-${index}`}
                    variants={rowItem}
                    className={cn(
                      ROW_COLUMNS,
                      "rounded-xl border p-3 transition-colors",
                      isMe
                        ? "border-brand-500/50 bg-brand-500/10 ring-brand-500/30 ring-1"
                        : "border-border bg-surface hover:border-brand-500/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold tabular-nums",
                        rank <= 3 ? PLACE_TONE[rank - 1] : "border-border bg-surface-2 text-muted",
                      )}
                      aria-label={`Rank ${rank}`}
                    >
                      {rank}
                    </span>

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={row.user.profilePic}
                        name={row.user.name}
                        size="sm"
                        className="sm:hidden"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {row.hasProfile ? (
                            <Link
                              to={`/profile/${row.user.username}`}
                              className="hover:text-brand-500 truncate text-sm font-semibold transition-colors"
                            >
                              {row.user.name}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-semibold">{row.user.name}</span>
                          )}
                          {isMe && (
                            <Badge tone="brand" className="shrink-0">
                              You
                            </Badge>
                          )}
                        </span>
                        {row.hasProfile && (
                          <p className="text-subtle truncate text-xs">@{row.user.username}</p>
                        )}

                        {/* card layout for phones */}
                        <div className="text-subtle mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:hidden">
                          <span className="text-brand-500 font-semibold">
                            {row.totalScore.toLocaleString()} pts
                          </span>
                          <span>
                            {row.games} {row.games === 1 ? "game" : "games"}
                          </span>
                          <span className="max-w-[60%] min-w-0 truncate">Best: {row.topGame}</span>
                        </div>
                      </div>
                    </div>

                    <span className="hidden text-right text-sm font-semibold tabular-nums sm:block">
                      {row.totalScore.toLocaleString()}
                    </span>
                    <span className="text-muted hidden text-center text-sm tabular-nums sm:block">
                      {row.games}
                    </span>
                    <span
                      className="text-muted hidden truncate text-sm sm:block"
                      title={row.topGame}
                    >
                      {row.topGame}
                    </span>
                  </motion.li>
                );
              })}
            </motion.ul>
          </section>

          <div className="flex flex-col items-center gap-2 pt-1">
            {list.hasNextPage ? (
              <Button
                variant="outline"
                loading={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                Load more players
              </Button>
            ) : (
              <span className="text-subtle flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                That's every ranked player
              </span>
            )}
            <span className="text-subtle flex items-center gap-1.5 text-[11px]">
              <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
              Scores come from the stats you log on the games page.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
