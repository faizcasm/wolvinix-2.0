import { z } from "zod";

/**
 * Zod-validated environment loading.
 *
 * `getEnv()` is intentionally lazy: importing this module never throws, so pure
 * modules can be imported by unit tests. `server.ts` calls `getEnv()` as its very
 * first action (after dotenv) which makes the process fail fast with a readable
 * message instead of crashing somewhere deep inside a request handler.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  /** Comma separated list of allowed browser origins (CORS). */
  CLIENT: z.string().default("http://localhost:3000,http://localhost:5173"),
  MONGODB_URI: z.string().trim().min(1).default("mongodb://127.0.0.1:27017/wolvinix"),
  JWT_SECRET: z
    .string()
    .min(
      32,
      "JWT_SECRET must be at least 32 characters long — generate one with `openssl rand -hex 32`",
    ),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().min(1).default("jwt"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  /** Lifetime of the socket handshake ticket, in seconds. */
  SOCKET_TICKET_TTL: z.coerce.number().int().min(10).max(300).default(60),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),

  MAIL_HOST: z.string().default("smtp.gmail.com"),
  MAIL_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  MAIL_USER: z.string().default(""),
  MAIL_PASS: z.string().default(""),
  MAIL_FROM: z.string().default("Wolvinix <no-reply@wolvinix.app>"),
  /** Inbox that receives contact-form messages. */
  MAIL_TO: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new Error(
      `Invalid environment configuration:\n${lines.join("\n")}\n` +
        "Copy apps/api/.env.example to apps/api/.env and fill in the missing values.",
    );
  }
  return parsed.data;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/** Test helper — forces the next `getEnv()` to re-parse `process.env`. */
export function resetEnvCache(): void {
  cached = null;
}

/** Splits the `CLIENT` variable into a list of allowed origins. */
export function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
