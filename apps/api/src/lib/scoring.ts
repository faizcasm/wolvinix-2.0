export interface EngagementInput {
  likesCount: number;
  repliesCount: number;
  ageHours: number;
}

/**
 * Explore ranking: `likes + 2 * replies`, decayed by age.
 *
 * The same formula is mirrored inside the Mongo aggregation used by
 * `GET /api/posts/explore` (keep both in sync).
 */
export function computeEngagementScore({
  likesCount,
  repliesCount,
  ageHours,
}: EngagementInput): number {
  const engagement = likesCount * 1 + repliesCount * 2;
  const hours = Math.max(0, Number.isFinite(ageHours) ? ageHours : 0);
  const decay = Math.pow(hours + 2, 1.4);
  return engagement / decay;
}
