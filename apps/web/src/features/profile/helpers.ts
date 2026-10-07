import type { Badge } from "@/types";

/**
 * A profile payload from `GET /users/:username` — the public `User` plus the
 * counters the endpoint adds.
 */
export interface ProfileUser {
  _id: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  profilePic: string;
  followers: string[];
  following: string[];
  clans: string[];
  isFrozen: boolean;
  role: "user" | "admin";
  badges: Badge[];
  createdAt: string;
  postCount?: number;
  followersCount?: number;
  followingCount?: number;
}

/** Followers needed before the verified badge is shown. */
export const VERIFIED_THRESHOLD = 1000;

export interface DisplayBadge {
  key: Badge;
  label: string;
  tone: "brand" | "accent" | "lime" | "warning";
}

const badgeMeta: Record<Badge, DisplayBadge> = {
  verified: { key: "verified", label: "Verified", tone: "accent" },
  clan_leader: { key: "clan_leader", label: "Clan leader", tone: "lime" },
  founder: { key: "founder", label: "Founder", tone: "brand" },
  early_adopter: { key: "early_adopter", label: "Early adopter", tone: "warning" },
};

const order: Badge[] = ["verified", "clan_leader", "founder", "early_adopter"];

/** Server badges plus the follower-count earned `verified` badge. */
export function displayBadges(profile: ProfileUser): DisplayBadge[] {
  const owned = new Set<Badge>(profile.badges ?? []);
  if ((profile.followersCount ?? profile.followers?.length ?? 0) >= VERIFIED_THRESHOLD) {
    owned.add("verified");
  }
  return order.filter((key) => owned.has(key)).map((key) => badgeMeta[key]);
}

/** Normalised stats row values (some deployments return counts, some arrays). */
export function profileCounts(profile: ProfileUser) {
  return {
    posts: profile.postCount ?? 0,
    followers: profile.followersCount ?? profile.followers?.length ?? 0,
    following: profile.followingCount ?? profile.following?.length ?? 0,
  };
}

/** Axios-style 404 check without importing axios into every component. */
export function isNotFoundError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404;
}
