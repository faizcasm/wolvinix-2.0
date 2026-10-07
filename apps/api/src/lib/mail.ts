import nodemailer from "nodemailer";
import { getEnv } from "../config/env.js";
import { ApiError } from "./errors.js";
import { logger } from "./logger.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export function isMailConfigured(): boolean {
  try {
    const env = getEnv();
    return Boolean(env.MAIL_USER && env.MAIL_PASS);
  } catch {
    return false;
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  const env = getEnv();
  if (!env.MAIL_USER || !env.MAIL_PASS) {
    throw ApiError.internal("Mail transport is not configured");
  }
  const transport = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465,
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
  });
  await transport.sendMail({ from: env.MAIL_FROM, ...message });
}

export async function sendPasswordResetOtp(email: string, otp: string): Promise<void> {
  await sendMail({
    to: email,
    subject: "Your Wolvinix password reset code",
    text:
      `Your Wolvinix password reset code is ${otp}.\n\n` +
      "It expires in 10 minutes. If you did not request this, you can safely ignore this email.",
    html:
      `<p>Your Wolvinix password reset code is:</p>` +
      `<p style="font-size:22px;letter-spacing:6px"><strong>${otp}</strong></p>` +
      `<p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
}

/** Logs mail failures without ever letting them bubble into user responses. */
export function logMailFailure(scope: string, error: unknown): void {
  logger.error({ err: error, scope }, "mail delivery failed");
}
