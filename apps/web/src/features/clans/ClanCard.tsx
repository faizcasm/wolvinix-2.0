import { Link } from "react-router-dom";
import { Crown, Users } from "lucide-react";
import { TiltCard } from "@/components/three/TiltCard";
import { Avatar, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCount, hueFrom } from "@/lib/utils";
import type { Clan } from "@/types";

interface ClanCardProps {
  clan: Clan;
  isMember: boolean;
  isLeader: boolean;
  /** The viewer already belongs to a different clan. */
  blocked?: boolean;
  busy?: boolean;
  onToggle?: () => void;
}

/** Banner + crest + motto + join/leave, wrapped in the shared 3D tilt. */
export function ClanCard({ clan, isMember, isLeader, blocked, busy, onToggle }: ClanCardProps) {
  const hue = hueFrom(clan.name);
  const banner = `linear-gradient(135deg, hsl(${hue} 72% 45%), hsl(${(hue + 55) % 360} 70% 32%))`;
  const memberCount = clan.memberCount ?? clan.members?.length ?? 0;

  return (
    <TiltCard intensity={7} className="h-full">
      <article className="card-hover border-border bg-surface relative flex h-full flex-col overflow-hidden rounded-xl border">
        <div className="relative h-24 shrink-0" style={{ background: banner }}>
          {clan.clanProfile && (
            <img
              src={clan.clanProfile}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          <span className="from-surface via-surface/35 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>

        <div className="relative -mt-9 flex flex-1 flex-col px-4 pb-4">
          <Avatar
            src={clan.clanProfile}
            name={clan.name}
            size="lg"
            className="ring-surface ring-2"
          />

          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display truncate text-lg leading-tight font-bold">
                <Link
                  to={`/clans/${clan._id}`}
                  className="rounded-sm outline-offset-2 after:absolute after:inset-0 after:content-['']"
                >
                  {clan.name}
                </Link>
              </h3>
              {clan.motto && (
                <p className="text-accent mt-0.5 truncate text-xs italic">“{clan.motto}”</p>
              )}
            </div>
            {isLeader && (
              <Badge tone="warning" className="shrink-0">
                <Crown className="h-3 w-3" aria-hidden="true" /> Leader
              </Badge>
            )}
          </div>

          <p className="text-muted mt-2 line-clamp-2 flex-1 text-sm">
            {clan.description || "No description yet."}
          </p>

          <div className="border-border mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-subtle flex min-w-0 items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tabular">{formatCount(memberCount)}</span>
              </span>
              <span className="truncate">led by {clan.leader?.name ?? "unknown"}</span>
            </span>

            {onToggle && (
              <Button
                size="sm"
                variant={isMember ? "outline" : "primary"}
                onClick={onToggle}
                disabled={busy || (!isMember && blocked)}
                className="relative z-10 shrink-0"
              >
                {isMember ? "Leave" : "Join"}
              </Button>
            )}
          </div>

          {!isMember && blocked && (
            <p className="text-subtle mt-2 text-right text-[11px]">Leave your current clan first</p>
          )}
        </div>
      </article>
    </TiltCard>
  );
}

/** Grid placeholder while the clan list loads. */
export function ClanCardSkeleton() {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <div className="skeleton h-24 w-full" />
      <div className="space-y-3 p-4">
        <div className="skeleton -mt-11 h-14 w-14 rounded-full" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Compact clan row used by search results. */
export function ClanSearchRow({ clan }: { clan: Clan }) {
  const hue = hueFrom(clan.name);
  return (
    <li className="border-border bg-surface hover:border-border-strong relative overflow-hidden rounded-xl border transition-colors">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: `hsl(${hue} 70% 50%)` }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 p-3.5 pl-5">
        <Avatar src={clan.clanProfile} name={clan.name} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/clans/${clan._id}`}
            className="hover:text-brand-500 block truncate text-sm font-semibold"
          >
            {clan.name}
          </Link>
          <p className="text-muted truncate text-xs">
            {clan.motto || clan.description || "No motto yet"}
          </p>
        </div>
        <span className="bg-surface-2 text-subtle tabular flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {formatCount(clan.memberCount ?? clan.members?.length ?? 0)}
        </span>
      </div>
    </li>
  );
}
