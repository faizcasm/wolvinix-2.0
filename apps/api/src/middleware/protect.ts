import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env.js";
import { ApiError } from "../lib/errors.js";
import { verifySessionToken } from "../lib/token.js";
import { SAFE_USER_FIELDS, User } from "../models/user.js";

/**
 * JWT cookie authentication.
 *
 * Failure modes are all 401 — missing cookie, malformed/expired token, bad
 * payload shape and deleted users. This middleware never throws a 500.
 */
export async function protect(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieName = getEnv().COOKIE_NAME;
    const token = req.cookies?.[cookieName];
    const { userId } = verifySessionToken(token);

    const user = await User.findById(userId).select(SAFE_USER_FIELDS);
    if (!user) {
      next(ApiError.unauthorized("Your session is no longer valid — please sign in again"));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    // Anything unexpected during lookup is still an auth failure for the client.
    next(ApiError.unauthorized("Authentication failed"));
  }
}
