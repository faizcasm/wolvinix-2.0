import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, asyncHandler, zodFieldErrors } from "../lib/errors.js";
import { mapError } from "../middleware/errorHandler.js";

describe("ApiError", () => {
  it("maps factories onto contract codes and statuses", () => {
    expect(ApiError.validation()).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    expect(ApiError.unauthorized()).toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(ApiError.forbidden()).toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(ApiError.notFound()).toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect(ApiError.conflict()).toMatchObject({ status: 409, code: "CONFLICT" });
    expect(ApiError.rateLimited()).toMatchObject({ status: 429, code: "RATE_LIMITED" });
    expect(ApiError.internal()).toMatchObject({ status: 500, code: "INTERNAL" });
  });

  it("only exposes messages for 4xx", () => {
    expect(ApiError.notFound("gone").expose).toBe(true);
    expect(ApiError.internal("db password is wrong").expose).toBe(false);
  });
});

describe("zodFieldErrors", () => {
  it("flattens issues by path", () => {
    const result = z
      .object({ email: z.string().email(), nested: z.object({ age: z.number() }) })
      .safeParse({ email: "nope", nested: { age: "x" } });
    expect(result.success).toBe(false);
    const details = zodFieldErrors(result.error!);
    expect(details.email).toBeTruthy();
    expect(details["nested.age"]).toBeTruthy();
  });
});

describe("mapError", () => {
  it("passes ApiError through with its code", () => {
    const mapped = mapError(ApiError.notFound("Post not found"));
    expect(mapped.status).toBe(404);
    expect(mapped.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Post not found" },
    });
  });

  it("keeps validation details for 4xx", () => {
    const mapped = mapError(ApiError.validation("Validation failed", { title: "Required" }));
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.details).toEqual({ title: "Required" });
  });

  it("never leaks internal messages for 5xx", () => {
    const mapped = mapError(ApiError.internal("connection refused: password secret123"));
    expect(mapped.status).toBe(500);
    expect(mapped.body.error).toEqual({
      code: "INTERNAL",
      message: "Something went wrong. Please try again later.",
    });
    expect(JSON.stringify(mapped)).not.toContain("secret123");
  });

  it("maps ZodError to VALIDATION_ERROR with field details", () => {
    const parsed = z.object({ email: z.string().email() }).safeParse({ email: "bad" });
    const mapped = mapError(parsed.error);
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
    expect(mapped.body.error.details).toHaveProperty("email");
  });

  it("maps mongoose ValidationError to VALIDATION_ERROR", () => {
    const mapped = mapError({
      name: "ValidationError",
      errors: { email: { message: "Path `email` is required." } },
    });
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
    expect(mapped.body.error.details).toEqual({ email: "Path `email` is required." });
  });

  it("maps CastError (bad ObjectId) to a 400, not a 500", () => {
    const mapped = mapError({ name: "CastError", path: "_id", message: "Cast to ObjectId failed" });
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
    expect(mapped.body.error.details).toEqual({ _id: "Invalid format" });
  });

  it("maps duplicate key errors to CONFLICT", () => {
    const mapped = mapError({ name: "MongoServerError", code: 11000 });
    expect(mapped.status).toBe(409);
    expect(mapped.body.error.code).toBe("CONFLICT");
  });

  it("maps multer size errors to VALIDATION_ERROR", () => {
    const mapped = mapError({ name: "MulterError", code: "LIMIT_FILE_SIZE" });
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.message).toMatch(/15 MB/);
  });

  it("maps oversized JSON payloads", () => {
    const mapped = mapError({ type: "entity.too.large", status: 413 });
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("falls back to a generic 500 for anything unknown", () => {
    const mapped = mapError(new Error("boom, stack trace follows"));
    expect(mapped.status).toBe(500);
    expect(mapped.body).toEqual({
      success: false,
      error: { code: "INTERNAL", message: "Something went wrong. Please try again later." },
    });
    expect(JSON.stringify(mapped)).not.toContain("boom");
  });
});

describe("asyncHandler", () => {
  it("forwards rejections to next()", async () => {
    const failure = new Error("boom");
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw failure;
    });
    handler({} as any, {} as any, next);
    await new Promise((resolve) => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(failure);
  });

  it("forwards synchronous throws to next()", () => {
    const next = vi.fn();
    const handler = asyncHandler(() => {
      throw new Error("sync boom");
    });
    handler({} as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });
});
