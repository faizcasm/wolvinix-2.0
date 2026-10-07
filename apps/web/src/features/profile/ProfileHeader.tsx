import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Award, Calendar, Share2, Snowflake, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCount } from "@/lib/utils";
import { FollowButton } from "./FollowButton";
import { displayBadges, profileCounts, type ProfileUser } from "./helpers";

export interface ProfileHeaderProps {
  profile: ProfileUser;
  isOwn: boolean;
  isFollowing: boolean;
  onFollowers: () => void;
  onFollowing: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
}

const BIO_CLAMP = 140;

export function ProfileHeader({
  profile,
  isOwn,
  isFollowing,
  onFollowers,
  onFollowing,
  onOpenStats,
  onOpenAchievements,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [followers, setFollowers] = useState(() => profileCounts(profile).followers);

  useEffect(() => {
    setFollowers(profileCounts(profile).followers);
  }, [profile]);

  const counts = profileCounts(profile);
  const badges = displayBadges(profile);
  const bio = profile.bio?.trim() ?? "";
  const clampable = bio.length > BIO_CLAMP;
  const visibleBio = clampable && !expanded ? `${bio.slice(0, BIO_CLAMP).trimEnd()}…` : bio;

  const joined = useMemo(() => {
    const date = new Date(profile.createdAt);
    return Number.isNaN(date.getTime()) ? "" : format(date, "MMMM yyyy");
  }, [profile.createdAt]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied", { description: "Share it with your pack." });
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        aria-label={`Profile of ${profile.name}`}
        className="card overflow-hidden"
      >
        {/* Banner */}
        <div className="from-brand-500/40 via-accent/25 to-lime/30 relative h-20 bg-gradient-to-r sm:h-24">
          <div
            aria-hidden="true"
            className="from-brand-500/20 to-accent/20 absolute inset-0 bg-gradient-to-br via-transparent bg-[length:200%_200%]"
          />
        </div>

        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <div className="relative">
              <motion.span
                aria-hidden="true"
                className="from-brand-500 via-accent to-lime absolute -inset-1.5 rounded-full bg-gradient-to-br"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <span className="bg-surface absolute -inset-0.5 rounded-full" aria-hidden="true" />
              <Avatar
                src={profile.profilePic}
                name={profile.name}
                size="2xl"
                className="relative"
              />
            </div>

            <div className="flex items-center gap-2 pb-1.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy profile link"
                title="Copy profile link"
                onClick={share}
              >
                <Share2 className="h-4.5 w-4.5" aria-hidden="true" />
              </Button>
              {isOwn ? (
                <Button variant="outline" size="sm" onClick={() => navigate("/settings/profile")}>
                  Edit profile
                </Button>
              ) : (
                <FollowButton
                  userId={profile._id}
                  initialFollowing={isFollowing}
                  onChange={(next) =>
                    setFollowers((current) => (next ? current + 1 : Math.max(0, current - 1)))
                  }
                />
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold sm:text-2xl">{profile.name}</h1>
              {badges.map((badge) => (
                <Badge key={badge.key} tone={badge.tone}>
                  {badge.label}
                </Badge>
              ))}
              {profile.isFrozen && (
                <Badge tone="warning">
                  <Snowflake className="h-3 w-3" aria-hidden="true" />
                  Frozen
                </Badge>
              )}
            </div>
            <p className="text-subtle mt-0.5 text-sm">@{profile.username}</p>
          </div>

          {bio && (
            <div className="mt-3">
              <p className="text-muted text-sm leading-relaxed break-words whitespace-pre-wrap">
                {visibleBio}
              </p>
              {clampable && (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  aria-expanded={expanded}
                  className="text-accent hover:text-brand-500 mt-1 text-xs font-semibold transition-colors"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {joined && (
            <p className="text-subtle mt-3 flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Joined {joined}
            </p>
          )}

          <div className="border-border mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
            <span className="text-left">
              <span className="font-display tabular text-lg font-bold">
                {formatCount(counts.posts)}
              </span>
              <span className="text-muted ml-1.5 text-xs">posts</span>
            </span>
            <button
              type="button"
              onClick={onFollowers}
              className="group text-left transition-transform hover:-translate-y-0.5"
              aria-label={`Show ${counts.followers} followers`}
            >
              <span className="font-display tabular text-gradient-static text-lg font-bold">
                {formatCount(followers)}
              </span>
              <span className="text-muted group-hover:text-foreground ml-1.5 text-xs">
                followers
              </span>
            </button>
            <button
              type="button"
              onClick={onFollowing}
              className="group text-left transition-transform hover:-translate-y-0.5"
              aria-label={`Show who ${profile.username} follows`}
            >
              <span className="font-display tabular text-lg font-bold">
                {formatCount(counts.following)}
              </span>
              <span className="text-muted group-hover:text-foreground ml-1.5 text-xs">
                following
              </span>
            </button>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={<Trophy className="h-4.5 w-4.5" aria-hidden="true" />}
          title="Game stats"
          subtitle="Scores, levels, records"
          onClick={onOpenStats}
        />
        <ActionCard
          icon={<Users className="h-4.5 w-4.5" aria-hidden="true" />}
          title={profile.clans?.length ? "Clan member" : "No clan yet"}
          subtitle={profile.clans?.length ? "Visit your clan" : "Find a pack to join"}
          to="/clans"
        />
        <ActionCard
          icon={<Award className="h-4.5 w-4.5" aria-hidden="true" />}
          title="Achievements"
          subtitle="Milestones unlocked"
          onClick={onOpenAchievements}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onClick,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  to?: string;
}) {
  const content = (
    <>
      <span className="bg-brand-500/15 text-brand-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="text-subtle block truncate text-xs">{subtitle}</span>
      </span>
    </>
  );

  const className =
    "card flex w-full items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md focus-visible:-translate-y-1";

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
