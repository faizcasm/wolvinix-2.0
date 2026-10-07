import jwt from "jsonwebtoken";
import type { CookieOptions, Response } from "express";
import { getEnv } from "../config/env.js";
import { ApiError } from "./errors.js";

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId: string;
}

export function signSessionToken(userId: string): string {
  const env = getEnv();
  return jwt.sign({ sub: userId, typ: "session" }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Verifies the session cookie token. Throws a 401 ApiError, never a 500. */
export function verifySessionToken(token: unknown): SessionPayload {
  const env = getEnv();
  if (typeof token !== "string" || token.length === 0) {
    throw ApiError.unauthorized("Authentication required");
  }
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw ApiError.unauthorized("Your session is invalid or has expired");
  }
  if (!payload || typeof payload.sub !== "string" || payload.typ !== "session") {
    throw ApiError.unauthorized("Your session is invalid or has expired");
  }
  return { userId: payload.sub };
}

/**
 * Single source of truth for the session cookie — `setAuthCookie`,
 * `clearAuthCookie` and `protect` all use these exact options, so logout and
 * account deletion can never leave a stale cookie behind.
 */
export function sessionCookieOptions(): CookieOptions {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" || env.COOKIE_SAMESITE === "none",
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(getEnv().COOKIE_NAME, token, sessionCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(getEnv().COOKIE_NAME, { ...options, maxAge: undefined });
}
