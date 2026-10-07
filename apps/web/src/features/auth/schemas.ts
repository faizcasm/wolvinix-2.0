import { z } from "zod";

/* ------------------------------ Field rules ------------------------------ */

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(160, "That email is too long")
  .email("Enter a valid email address");

export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Passwords are capped at 72 characters");

export const usernameField = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(20, "Keep it under 20 characters")
  .regex(/^[A-Za-z0-9_]+$/, "Letters, numbers and underscores only");

/* -------------------------------- Schemas -------------------------------- */

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Tell us your name").max(40, "Keep it under 40 characters"),
    username: usernameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Form value types are declared by hand (instead of `z.infer`) so every field
 * stays required — this project compiles with `strict: false`, and TypeScript
 * treats every zod-inferred object property as optional in that mode.
 */
export interface LoginValues {
  email: string;
  password: string;
}

export interface SignupValues {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordValues {
  email: string;
}

export interface ResetPasswordValues {
  otp: string;
  password: string;
  confirmPassword: string;
}

/* --------------------------- Password strength --------------------------- */

export type StrengthLabel = "weak" | "fair" | "strong" | "elite";

export interface PasswordStrength {
  /** 0 = weak, 1 = fair, 2 = strong, 3 = elite */
  score: 0 | 1 | 2 | 3;
  label: StrengthLabel;
  hint: string;
  percent: number;
  tone: "danger" | "warning" | "accent" | "lime";
}

/**
 * Deterministic strength heuristic — length, character variety and symbols.
 * No external dependencies so the meter never blocks typing.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "weak",
      hint: "Start typing to see strength",
      percent: 0,
      tone: "danger",
    };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const table: Array<Pick<PasswordStrength, "label" | "hint" | "tone">> = [
    { label: "weak", hint: "Add length and a number", tone: "danger" },
    { label: "fair", hint: "Mix in capitals and symbols", tone: "warning" },
    { label: "strong", hint: "Solid — a symbol makes it elite", tone: "accent" },
    { label: "elite", hint: "Pack-proof password", tone: "lime" },
  ];

  const score: 0 | 1 | 2 | 3 = points <= 1 ? 0 : points === 2 ? 1 : points <= 4 ? 2 : 3;

  return {
    score,
    ...table[score],
    percent: [25, 50, 75, 100][score],
  };
}
