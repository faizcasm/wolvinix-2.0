import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/features/games/GameCard";
import { GAMES, GENRES } from "@/features/games/catalog";

const PAGE_SIZE = 8;
const BOOT_DELAY_MS = 300;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
} as const;

function GameCardSkeleton() {
  return (
    <div className="border-border bg-surface animate-pulse overflow-hidden rounded-2xl border">
      <div className="bg-surface-2 aspect-[16/10] w-full" />
      <div className="space-y-2 p-4">
        <div className="bg-surface-2 h-4 w-2/3 rounded" />
        <div className="bg-surface-2 h-3 w-1/3 rounded" />
        <div className="bg-surface-2 h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [booting, setBooting] = useState(true);
  const bootTimer = useRef<number | null>(null);

  useEffect(() => {
    bootTimer.current = window.setTimeout(() => setBooting(false), BOOT_DELAY_MS);
    return () => {
      if (bootTimer.current !== null) window.clearTimeout(bootTimer.current);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (genre && g.genre !== genre) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q)
      );
    });
  }, [query, genre]);

  const visible = results.slice(0, page * PAGE_SIZE);
  const hasMore = results.length > visible.length;

  const resetPaging = () => setPage(1);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex items-center gap-3">
        <span className="bg-brand-500/10 text-brand-500 grid size-11 shrink-0 place-items-center rounded-2xl">
          <Gamepad2 size={22} aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Games</h1>
          <p className="text-muted text-sm">Instant browser games — no downloads, just vibes.</p>
        </div>
      </header>

      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          resetPaging();
        }}
        placeholder="Search games…"
        aria-label="Search games"
        leftIcon={<Search size={16} aria-hidden />}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by genre">
        {[null, ...GENRES].map((g) => {
          const active = genre === g;
          const label = g ?? "All";
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setGenre(g);
                resetPaging();
              }}
              className={`focus-visible:outline-brand-500 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="border-accent/30 bg-accent/10 text-foreground flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
        <Sparkles size={16} aria-hidden className="text-accent shrink-0" />
        <span>Stats you log here show up under your profile for friends to see.</span>
      </div>

      {booting ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Loading games"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-border bg-surface-2/40 flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center"
        >
          <Gamepad2 size={40} aria-hidden className="text-muted" />
          <p className="font-semibold">No games found</p>
          <p className="text-muted max-w-xs text-sm">
            Nothing matches “{query || genre}”. Try another title or clear your filters.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setGenre(null);
              resetPaging();
            }}
          >
            Clear filters
          </Button>
        </motion.div>
      ) : (
        <>
          <motion.ul
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {visible.map((game) => (
              <motion.li key={game.id} variants={item} layout>
                <GameCard game={game} />
              </motion.li>
            ))}
          </motion.ul>

          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)}>
                Load more ({results.length - visible.length} left)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
