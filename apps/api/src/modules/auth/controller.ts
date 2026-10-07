import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import { getEnv } from "../../config/env.js";
import { ApiError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { logMailFailure, sendPasswordResetOtp } from "../../lib/mail.js";
import { created, ok } from "../../lib/response.js";
import { clearAuthCookie, setAuthCookie, signSessionToken } from "../../lib/token.js";
import { toSafeUser, User } from "../../models/user.js";
import { generateTicket } from "./ticket.js";
import type { LoginInput, ResetPasswordInput, SignupInput } from "./schemas.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LENGTH = 6;
const BCRYPT_ROUNDS = 10;

/** 6 cryptographically random digits (never `Math.random`). */
export function generateOtp(): string {
  const max = 10 ** OTP_LENGTH;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(OTP_LENGTH, "0");
}

async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, username, email, password } = req.body as SignupInput;

  const existing = await User.findOne({ $or: [{ email }, { username }] }).select("_id");
  if (existing) {
    throw ApiError.conflict("An account with that email or username already exists");
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, username, email, password: hashed }).catch((error) => {
    if ((error as { code?: number }).code === 11000) {
      throw ApiError.conflict("An account with that email or username already exists");
    }
    throw error;
  });

  const token = signSessionToken(String(user._id));
  setAuthCookie(res, token);
  created(res, { user: toSafeUser(user), token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email }).select("+password");
  const valid = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signSessionToken(String(user._id));
  setAuthCookie(res, token);
  ok(res, { user: toSafeUser(user), token });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  ok(res, { ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  ok(res, { user: toSafeUser(req.user) });
}

/**
 * Always answers with the same generic payload/timing, whether or not the
 * address exists — no user enumeration, no user document in the response.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email }).select("+resetpassotp +resetpassexpiry");

  if (!user) {
    // Equalise response timing with the real-user path (same bcrypt cost).
    await bcrypt.hash(crypto.randomBytes(16).toString("hex"), BCRYPT_ROUNDS);
    ok(res, { ok: true });
    return;
  }

  const otp = generateOtp();
  user.resetpassotp = await hashOtp(otp);
  user.resetpassexpiry = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendPasswordResetOtp(user.email, otp);
  } catch (error) {
    logMailFailure("forgot-password", error);
  }

  ok(res, { ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, otp, password } = req.body as ResetPasswordInput;

  const user = await User.findOne({ email }).select(
    "+password +resetpassotp +resetpassexpiry +otpAttempts",
  );

  const invalid = () =>
    ApiError.validation("That code is invalid or has expired — request a new one");

  if (!user || !user.resetpassotp || !user.resetpassexpiry) throw invalid();
  if (user.resetpassexpiry.getTime() < Date.now()) {
    await User.updateOne(
      { _id: user._id },
      { $unset: { resetpassotp: "", resetpassexpiry: "" }, $set: { otpAttempts: 0 } },
    );
    throw invalid();
  }
  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    await User.updateOne(
      { _id: user._id },
      { $unset: { resetpassotp: "", resetpassexpiry: "" }, $set: { otpAttempts: 0 } },
    );
    throw ApiError.validation("Too many incorrect attempts — request a new code");
  }

  const matches = await bcrypt.compare(otp, user.resetpassotp);
  if (!matches) {
    await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
    throw invalid();
  }

  // Invalidate the code for real this time (the old server cleared fields that
  // never existed, leaving OTPs valid for ~58 minutes).
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { password: hashedPassword, otpAttempts: 0 },
      $unset: { resetpassotp: "", resetpassexpiry: "" },
    },
  );

  logger.info({ userId: String(user._id) }, "password reset completed");
  ok(res, { ok: true });
}

/** Issues the 60s ticket used for the socket.io handshake. */
export async function socketTicket(req: Request, res: Response): Promise<void> {
  const env = getEnv();
  const ticket = generateTicket(String(req.user._id), { ttlSeconds: env.SOCKET_TICKET_TTL });
  ok(res, { ticket, expiresIn: env.SOCKET_TICKET_TTL });
}
