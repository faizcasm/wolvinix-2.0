import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { fail } from "../lib/response.js";

function reject(_req: unknown, res: any): void {
  fail(res, 429, "RATE_LIMITED", "Too many requests, please try again later.");
}

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  handler: reject,
};

function limit(windowMs: number, max: number): RateLimitRequestHandler {
  return rateLimit({ ...base, windowMs, max });
}

/** signup / login / reset-password: 10 requests per 15 min per IP. */
export const authLimiter = limit(15 * 60 * 1000, 10);

/** forgot-password: 5 requests per 15 min per IP (stricter, it sends mail). */
export const forgotLimiter = limit(15 * 60 * 1000, 5);

/** contact form: 5 requests per 15 min per IP (it sends mail too). */
export const contactLimiter = limit(15 * 60 * 1000, 5);

/** Everything else under /api. */
export const globalLimiter = limit(15 * 60 * 1000, 300);
