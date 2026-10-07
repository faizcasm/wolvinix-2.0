import { Story } from "../models/story.js";
import { User } from "../models/user.js";
import { logger } from "./logger.js";

/**
 * Housekeeping that used to live in the old server's cron file (which only
 * pinged the host): expired stories, stale OTP material, orphaned tombstones.
 * Runs on an interval started by `server.ts`.
 */
export async function runCleanup(): Promise<void> {
  const now = new Date();

  const stories = await Story.deleteMany({ expiresAt: { $lte: now } });
  const users = await User.updateMany(
    { resetpassexpiry: { $ne: null, $lte: now } },
    { $unset: { resetpassotp: "", resetpassexpiry: "" }, $set: { otpAttempts: 0 } },
  );

  if (stories.deletedCount || users.modifiedCount) {
    logger.info(
      { expiredStories: stories.deletedCount, clearedOtps: users.modifiedCount },
      "cleanup job completed",
    );
  }
}

export function startCleanupJob(intervalMs = 15 * 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(() => {
    runCleanup().catch((error) => logger.error({ err: error }, "cleanup job failed"));
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopCleanupJob(timer: NodeJS.Timeout | null): void {
  if (timer) clearInterval(timer);
}
