import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, PencilLine, Star, Users } from "lucide-react";
import { TiltCard } from "@/components/three/TiltCard";
import { hueFrom } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { GameEntry } from "./catalog";

/** Generated cover gradient — derived from the title, zero external images. */
export function coverFor(game: GameEntry) {
  const hue = hueFrom(game.title);
  return `linear-gradient(135deg, hsl(${hue} 72% 45%), hsl(${(hue + 55) % 360} 70% 28%))`;
}

export function GameCard({ game }: { game: GameEntry }) {
  const username = useAuthStore((s) => s.user?.username) ?? "";
  return (
    <TiltCard className="border-border bg-surface h-full overflow-hidden rounded-2xl border">
      <div className="flex h-full flex-col">
        <div
          className="relative aspect-[16/10] w-full"
          style={{ background: coverFor(game) }}
          role="img"
          aria-label={`${game.title} cover art`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
          <span className="absolute top-3 left-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {game.genre}
          </span>
          <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Users size={12} aria-hidden />
            {game.players}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-semibold" title={game.title}>
                {game.title}
              </h3>
              <span className="text-warning flex shrink-0 items-center gap-1 text-xs font-medium">
                <Star size={12} aria-hidden className="fill-current" />
                {game.rating.toFixed(1)}
              </span>
            </div>
            <p className="text-subtle text-xs">
              {game.developer} · {game.year}
            </p>
            <p className="text-muted mt-1 line-clamp-2 text-sm">{game.description}</p>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-1">
            <motion.a
              href={game.gameUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="bg-brand-500 hover:bg-brand-400 focus-visible:outline-brand-500 inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={`Play ${game.title} now (opens in a new tab)`}
            >
              <ExternalLink size={14} aria-hidden />
              Play now
            </motion.a>
            <Link
              to={username ? `/profile/${username}` : "/settings"}
              className="border-border text-muted hover:text-foreground focus-visible:outline-brand-500 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={`Log stats for ${game.title}`}
              title="Log stats"
            >
              <PencilLine size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
