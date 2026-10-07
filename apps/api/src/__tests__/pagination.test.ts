import { describe, expect, it } from "vitest";
import { buildMeta, DEFAULT_LIMIT, MAX_LIMIT, parsePagination } from "../lib/pagination.js";

describe("parsePagination", () => {
  it("falls back to page 1 / default limit", () => {
    expect(parsePagination()).toEqual({ page: 1, limit: DEFAULT_LIMIT, skip: 0 });
    expect(parsePagination({})).toEqual({ page: 1, limit: DEFAULT_LIMIT, skip: 0 });
    expect(parsePagination({ query: {} })).toEqual({ page: 1, limit: DEFAULT_LIMIT, skip: 0 });
  });

  it("reads page and limit from req.query", () => {
    expect(parsePagination({ query: { page: "3", limit: "10" } })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it("accepts numeric values too", () => {
    expect(parsePagination({ query: { page: 2, limit: 5 } })).toEqual({
      page: 2,
      limit: 5,
      skip: 5,
    });
  });

  it("clamps limit to MAX_LIMIT (contract: max 50)", () => {
    expect(parsePagination({ query: { limit: "500" } }).limit).toBe(MAX_LIMIT);
    expect(parsePagination({ query: { limit: "50" } }).limit).toBe(50);
  });

  it("ignores garbage values", () => {
    expect(parsePagination({ query: { page: "abc", limit: "xyz" } })).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      skip: 0,
    });
    expect(parsePagination({ query: { page: "-4", limit: "0" } })).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      skip: 0,
    });
    expect(parsePagination({ query: { page: "2.9" } }).page).toBe(2);
  });

  it("accepts a bare query object", () => {
    expect(parsePagination({ page: "2", limit: "5" })).toEqual({ page: 2, limit: 5, skip: 5 });
  });
});

describe("buildMeta", () => {
  it("matches the contract example (120 items, 20 per page)", () => {
    expect(buildMeta(120, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 120,
      totalPages: 6,
      hasMore: true,
    });
  });

  it("reports no more data on the last page", () => {
    expect(buildMeta(120, 6, 20).hasMore).toBe(false);
    expect(buildMeta(45, 2, 20).hasMore).toBe(true);
    expect(buildMeta(45, 3, 20).hasMore).toBe(false);
  });

  it("handles empty results", () => {
    expect(buildMeta(0, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasMore: false,
    });
  });
});
