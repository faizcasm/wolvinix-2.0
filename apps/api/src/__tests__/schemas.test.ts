import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "../lib/errors.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signupSchema,
} from "../modules/auth/schemas.js";
import { contactSchema, freezeSchema, updateMeSchema } from "../modules/users/schemas.js";
import { createPostSchema, replySchema } from "../modules/posts/schemas.js";
import { sendMessageSchema } from "../modules/messages/schemas.js";
import { createClanSchema } from "../modules/clans/schemas.js";

const VALID_ID = "64b000000000000000000001";

describe("auth schemas", () => {
  it("accepts a valid signup", () => {
    const parsed = signupSchema.parse({
      name: "  Faizan ",
      username: "Faizan.H",
      email: "  USER@Example.COM ",
      password: "secret1",
    });
    expect(parsed.name).toBe("Faizan");
    expect(parsed.username).toBe("faizan.h");
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects weak passwords, short names and odd usernames", () => {
    expect(
      signupSchema.safeParse({ name: "F", username: "abc", email: "a@b.co", password: "secret1" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        name: "Faizan",
        username: "a b",
        email: "a@b.co",
        password: "secret1",
      }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ name: "Faizan", username: "abc", email: "a@b.co", password: "123" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        name: "Faizan",
        username: "abc",
        email: "nope",
        password: "secret1",
      }).success,
    ).toBe(false);
  });

  it("requires a 6 digit OTP on reset-password", () => {
    const base = { email: "a@b.co", password: "secret1" };
    expect(resetPasswordSchema.safeParse({ ...base, otp: "123456" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, otp: "12345" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...base, otp: "abcdef" }).success).toBe(false);
  });

  it("requires an email for forgot-password", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "user@example" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe("user schemas", () => {
  it("requires at least one field in PATCH /users/me", () => {
    expect(updateMeSchema.safeParse({ bio: "hello" }).success).toBe(true);
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });

  it("accepts only booleans for freeze", () => {
    expect(freezeSchema.safeParse({ frozen: true }).success).toBe(true);
    expect(freezeSchema.safeParse({ frozen: "yes" }).success).toBe(false);
  });

  it("validates contact form fields", () => {
    expect(
      contactSchema.safeParse({ name: "Faizan", email: "a@b.co", message: "Hello there" }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ name: "F", email: "a@b.co", message: "Hello there" }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ name: "Faizan", email: "a@b.co", message: "hi" }).success,
    ).toBe(false);
  });
});

describe("post / message / clan schemas", () => {
  it("caps post text at 500 characters", () => {
    expect(createPostSchema.safeParse({ text: "hello" }).success).toBe(true);
    expect(createPostSchema.safeParse({ text: "x".repeat(501) }).success).toBe(false);
    expect(createPostSchema.safeParse({ text: "" }).success).toBe(false);
  });

  it("requires text for replies", () => {
    expect(replySchema.safeParse({ text: "nice clip" }).success).toBe(true);
    expect(replySchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("requires text or an image for messages", () => {
    expect(sendMessageSchema.safeParse({ text: "hi" }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ imageUrl: "https://cdn.x/y.png" }).success).toBe(true);
    expect(sendMessageSchema.safeParse({}).success).toBe(false);
    expect(sendMessageSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("requires the clan trio", () => {
    const clan = { name: "Wolves", description: "We howl", motto: "Together" };
    expect(createClanSchema.safeParse(clan).success).toBe(true);
    expect(createClanSchema.safeParse({ ...clan, motto: "" }).success).toBe(false);
    expect(createClanSchema.safeParse({ name: "Wolves" }).success).toBe(false);
  });

  it("accepts object ids in arrays", () => {
    expect(createPostSchema.safeParse({ text: "hi", tags: [VALID_ID] }).success).toBe(true);
    expect(createPostSchema.safeParse({ text: "hi", tags: ["not-an-id"] }).success).toBe(false);
  });
});

describe("validate middleware", () => {
  function run(schemas: Parameters<typeof validate>[0], req: Record<string, unknown>) {
    const next = vi.fn();
    validate(schemas)(req as any, {} as any, next);
    return next;
  }

  it("calls next() without arguments when the body is valid", () => {
    const next = run({ body: replySchema }, { body: { text: "hello" } });
    expect(next).toHaveBeenCalledWith();
  });

  it("turns schema failures into a 400 ApiError with field details", () => {
    const next = run({ body: replySchema }, { body: {} });
    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toHaveProperty("text");
  });

  it("validates query strings and keeps the parsed values", () => {
    const req: Record<string, unknown> = { query: { q: "" } };
    const next = run({ query: z.object({ q: z.string().min(1) }).passthrough() }, req);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect((next.mock.calls[0][0] as ApiError).details).toHaveProperty("q");
  });

  it("validates params", () => {
    const next = run(
      { params: z.object({ id: z.string().regex(/^[0-9a-f]{24}$/) }) },
      { params: { id: "nope" } },
    );
    expect((next.mock.calls[0][0] as ApiError).code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-object bodies", () => {
    const next = run({ body: replySchema }, { body: "not-an-object" });
    expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });
});
