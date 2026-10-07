import { motion } from "framer-motion";
import {
  Award,
  CalendarClock,
  Check,
  Image as ImageIcon,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { VERIFIED_THRESHOLD, type ProfileUser } from "./helpers";

interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
}

const FOLLOW_GOAL = 10;
const PROFILE_FIELDS = 4;

function daysSince(date: string) {
  const created = new Date(date).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
}

/**
 * Achievements are derived client-side from the profile we already loaded —
 * no extra round trip, and they always agree with what the header shows.
 */
export function deriveAchievements(profile: ProfileUser, postCount: number): Achievement[] {
  const followers = profile.followersCount ?? profile.followers?.length ?? 0;
  const badges = new Set(profile.badges ?? []);
  const completed = [profile.name, profile.username, profile.bio, profile.profilePic].filter(
    (field) => Boolean(field && field.trim()),
  ).length;
  const age = daysSince(profile.createdAt);

  return [
    {
      key: "first-post",
      title: "Break the ice",
      description: "Publish your first post on the feed.",
      icon: MessageSquareText,
      unlocked: postCount >= 1,
      progress: Math.min(postCount, 1),
      progressLabel: postCount >= 1 ? "Complete" : `${postCount}/1 posts`,
    },
    {
      key: "followers-10",
      title: "Gather the pack",
      description: `Reach ${FOLLOW_GOAL} followers.`,
      icon: Users,
      unlocked: followers >= FOLLOW_GOAL,
      progress: Math.min(followers / FOLLOW_GOAL, 1),
      progressLabel: `${Math.min(followers, FOLLOW_GOAL)}/${FOLLOW_GOAL} followers`,
    },
    {
      key: "clan",
      title: "Fly a banner",
      description: "Join a clan and fight as part of something bigger.",
      icon: ShieldCheck,
      unlocked: (profile.clans?.length ?? 0) > 0,
      progress: (profile.clans?.length ?? 0) > 0 ? 1 : 0,
      progressLabel: (profile.clans?.length ?? 0) > 0 ? "Complete" : "No clan yet",
    },
    {
      key: "verified",
      title: "Verified player",
      description: `Hit ${VERIFIED_THRESHOLD} followers to earn the verified badge.`,
      icon: Award,
      unlocked: badges.has("verified") || followers >= VERIFIED_THRESHOLD,
      progress: Math.min(followers / VERIFIED_THRESHOLD, 1),
      progressLabel: `${Math.min(followers, VERIFIED_THRESHOLD).toLocaleString()}/${VERIFIED_THRESHOLD.toLocaleString()}`,
    },
    {
      key: "early-adopter",
      title: "Early adopter",
      description: "Been part of Wolvinix for over a year.",
      icon: CalendarClock,
      unlocked: badges.has("early_adopter") || badges.has("founder") || age >= 365,
      progress: badges.has("early_adopter") || badges.has("founder") ? 1 : Math.min(age / 365, 1),
      progressLabel: age >= 365 ? "Complete" : `${age}/365 days`,
    },
    {
      key: "profile-complete",
      title: "Fully kitted",
      description: "Name, username, bio and avatar all filled in.",
      icon: ImageIcon,
      unlocked: completed === PROFILE_FIELDS,
      progress: completed / PROFILE_FIELDS,
      progressLabel: `${completed}/${PROFILE_FIELDS} fields`,
    },
  ];
}

interface AchievementsProps {
  profile: ProfileUser;
  postCount: number;
  open: boolean;
  onClose: () => void;
}

export function Achievements({ profile, postCount, open, onClose }: AchievementsProps) {
  const achievements = deriveAchievements(profile, postCount);
  const unlocked = achievements.filter((entry) => entry.unlocked).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Achievements"
      description={`${unlocked} of ${achievements.length} unlocked for @${profile.username}`}
    >
      {achievements.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" aria-hidden="true" />}
          title="Nothing here yet"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {achievements.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <motion.li
                key={entry.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.06, 0.4),
                  type: "spring",
                  stiffness: 260,
                  damping: 24,
                }}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-4 transition-colors",
                  entry.unlocked
                    ? "border-brand-500/30 bg-surface-2"
                    : "border-border bg-surface border-dashed",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      entry.unlocked
                        ? "from-brand-500/25 to-accent/20 text-brand-500 bg-gradient-to-br"
                        : "bg-surface-3 text-subtle",
                    )}
                  >
                    {entry.unlocked ? (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Lock className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display truncate text-sm font-semibold">{entry.title}</h3>
                      {entry.unlocked && (
                        <span className="bg-lime-soft text-lime flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <p className="text-muted mt-0.5 text-xs leading-relaxed">{entry.description}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <ProgressBar
                    value={Math.round(entry.progress * 100)}
                    tone={entry.unlocked ? "lime" : "brand"}
                  />
                  <p className="text-subtle tabular text-[11px]">{entry.progressLabel}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export default Achievements;
