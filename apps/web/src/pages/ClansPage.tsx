import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, Plus, Search, Users, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { flattenPages } from "@/features/shared/usePaginatedList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { ClanCard, ClanCardSkeleton } from "@/features/clans/ClanCard";
import { ClanFormModal } from "@/features/clans/ClanFormModal";
import {
  isLeaderOf,
  isMemberOf,
  useClans,
  useJoinClan,
  useLeaveClan,
} from "@/features/clans/hooks";
import type { Clan } from "@/types";

/** The endpoint accepts several shapes — normalise them all to a list. */
function normalizeMyClans(value: unknown): Clan[] {
  let source: unknown[] = [];
  if (Array.isArray(value)) {
    source = value;
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.clans)) source = record.clans;
    else if (record._id) source = [record];
  }
  return source.filter(
    (entry): entry is Clan =>
      Boolean(entry) && typeof entry === "object" && Boolean((entry as Clan)._id),
  );
}

function useMyClans(meId: string) {
  return useQuery({
    queryKey: queryKeys.myClan,
    queryFn: async () => normalizeMyClans(await get<unknown>(`/users/clan/${meId}`)),
    enabled: Boolean(meId),
    staleTime: 60_000,
    retry: false,
  });
}

/** `/clans` — browse, search, join/leave and spin up a new clan. */
export default function ClansPage() {
  const user = useAuthStore((state) => state.user);
  const meId = user?._id ?? "";
  const reduceMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const list = useClans(query);
  const clans = useMemo(() => flattenPages(list.data?.pages), [list.data]);

  const join = useJoinClan();
  const leave = useLeaveClan();
  const busyId = join.isPending ? join.variables : leave.isPending ? leave.variables : null;

  const myClansQuery = useMyClans(meId);

  const myClanId = useMemo(
    () => myClansQuery.data?.[0]?._id ?? clans.find((clan) => isMemberOf(clan, meId))?._id ?? "",
    [myClansQuery.data, clans, meId],
  );

  const blockedFrom = (clan: Clan) =>
    Boolean(myClanId) && clan._id !== myClanId && !isMemberOf(clan, meId);

  const toggle = (clan: Clan) => {
    if (isMemberOf(clan, meId)) leave.mutate(clan._id);
    else join.mutate(clan._id);
  };

  const myClan = clans.find((clan) => clan._id === myClanId) ?? myClansQuery.data?.[0];

  return (
    <div className="space-y-6 pb-4">
      {/* hero */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="noise border-border bg-surface relative overflow-hidden rounded-2xl border p-6 sm:p-8"
      >
        <span
          className="bg-brand-500/25 pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <span
          className="bg-accent/20 pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="border-brand-500/30 bg-brand-500/10 text-brand-600 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> Squad up
            </span>
            <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
              Find your <span className="text-gradient">pack</span>
            </h1>
            <p className="text-muted mt-2 text-sm sm:text-base">
              Clans are where gamers organize raids, flex stats and find people who actually queue
              at 2am.
            </p>
          </div>
          <Button
            variant="gradient"
            size="lg"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
            className="shrink-0 self-start sm:self-auto"
          >
            Create clan
          </Button>
        </div>

        {myClan && (
          <Link
            to={`/clans/${myClan._id}`}
            className="border-border bg-surface-2 hover:border-brand-500/50 relative mt-5 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors"
          >
            <Crown className="text-warning h-4 w-4" aria-hidden="true" />
            <span className="font-medium">{myClan.name}</span>
            <span className="text-subtle">is your clan</span>
          </Link>
        )}
      </motion.header>

      {/* search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="text-subtle pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clans by name, motto or description"
            aria-label="Search clans"
            className="border-border bg-surface placeholder:text-subtle hover:border-border-strong focus:border-brand-500 h-11 w-full rounded-xl border pr-10 pl-10 text-sm transition-colors outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear clan search"
              className="text-subtle hover:bg-surface-2 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-subtle text-xs sm:text-right">
          {list.data?.pages?.[0]?.meta?.total != null
            ? `${list.data.pages[0].meta.total} clans`
            : "Loading clans…"}
        </p>
      </div>

      {/* grid */}
      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ClanCardSkeleton key={index} />
          ))}
        </div>
      ) : list.isError && clans.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Couldn't load clans"
          description="The server didn't answer. Give it another shot."
          action={
            <Button variant="outline" onClick={() => void list.refetch()}>
              Retry
            </Button>
          }
        />
      ) : clans.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={query ? "No clans match that search" : "No clans yet"}
          description={
            query
              ? "Try a different name or motto — or start the clan everyone will search for."
              : "Be the first to raise a banner. Create a clan and invite your squad."
          }
          action={
            <Button
              variant="gradient"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
            >
              Create the first clan
            </Button>
          }
        />
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
          }}
        >
          <AnimatePresence initial={false}>
            {clans.map((clan) => (
              <motion.div
                key={clan._id}
                layout={!reduceMotion}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="h-full"
              >
                <ClanCard
                  clan={clan}
                  isMember={isMemberOf(clan, meId)}
                  isLeader={isLeaderOf(clan, meId)}
                  blocked={blockedFrom(clan)}
                  busy={busyId === clan._id}
                  onToggle={() => toggle(clan)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {clans.length > 0 && (
        <div className="flex justify-center">
          {list.hasNextPage ? (
            <Button
              variant="outline"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Load more clans
            </Button>
          ) : (
            <span className="text-subtle text-xs">That's every clan</span>
          )}
        </div>
      )}

      <ClanFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
