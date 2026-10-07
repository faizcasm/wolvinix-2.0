import { describe, expect, it } from "vitest";
import { created, fail, ok, paginated } from "../lib/response.js";

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

describe("response envelope", () => {
  it("wraps success payloads as { success, data }", () => {
    const res = fakeRes();
    ok(res, { hello: "world" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { hello: "world" } });
  });

  it("uses 201 for created()", () => {
    const res = fakeRes();
    created(res, { _id: "1" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: { _id: "1" } });
  });

  it("adds pagination meta exactly like the contract", () => {
    const res = fakeRes();
    paginated(res, ["a", "b"], 120, 1, 20);
    expect(res.body).toEqual({
      success: true,
      data: ["a", "b"],
      meta: { page: 1, limit: 20, total: 120, totalPages: 6, hasMore: true },
    });
  });

  it("wraps failures as { success, error: { code, message } }", () => {
    const res = fakeRes();
    fail(res, 429, "RATE_LIMITED", "Slow down");
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      success: false,
      error: { code: "RATE_LIMITED", message: "Slow down" },
    });
  });

  it("includes details only when provided", () => {
    const res = fakeRes();
    fail(res, 400, "VALIDATION_ERROR", "Validation failed", { email: "Invalid email" });
    expect(res.body.error.details).toEqual({ email: "Invalid email" });
  });
});
