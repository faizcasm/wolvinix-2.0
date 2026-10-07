import { describe, expect, it } from "vitest";
import { computeEngagementScore } from "../lib/scoring.js";

describe("computeEngagementScore", () => {
  it("rewards fresh engagement", () => {
    const fresh = computeEngagementScore({ likesCount: 10, repliesCount: 0, ageHours: 0 });
    const stale = computeEngagementScore({ likesCount: 10, repliesCount: 0, ageHours: 48 });
    expect(fresh).toBeGreaterThan(stale);
  });

  it("weights replies twice as much as likes", () => {
    const replies = computeEngagementScore({ likesCount: 0, repliesCount: 5, ageHours: 6 });
    const likes = computeEngagementScore({ likesCount: 5, repliesCount: 0, ageHours: 6 });
    const both = computeEngagementScore({ likesCount: 5, repliesCount: 5, ageHours: 6 });
    expect(replies).toBeCloseTo(likes * 2, 10);
    expect(both).toBeCloseTo(likes * 3, 10);
  });

  it("scores zero-engagement posts at 0", () => {
    expect(computeEngagementScore({ likesCount: 0, repliesCount: 0, ageHours: 3 })).toBe(0);
  });

  it("clamps negative or invalid ages", () => {
    const normal = computeEngagementScore({ likesCount: 4, repliesCount: 0, ageHours: 0 });
    expect(computeEngagementScore({ likesCount: 4, repliesCount: 0, ageHours: -10 })).toBe(normal);
    expect(computeEngagementScore({ likesCount: 4, repliesCount: 0, ageHours: NaN })).toBe(normal);
  });

  it("ranks a hotter recent post above an older, equally liked one", () => {
    const recent = computeEngagementScore({ likesCount: 20, repliesCount: 3, ageHours: 2 });
    const older = computeEngagementScore({ likesCount: 20, repliesCount: 3, ageHours: 30 });
    expect(recent).toBeGreaterThan(older);
  });
});
