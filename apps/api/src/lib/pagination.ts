export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

/**
 * Reads `?page=&limit=` from a request (or any object with a `query` bag).
 * `limit` is clamped to MAX_LIMIT, invalid values fall back to defaults.
 */
export function parsePagination(
  req: { query?: unknown } | Record<string, unknown> = {},
): Pagination {
  const query = (
    req && typeof req === "object" && "query" in req ? (req as { query?: unknown }).query : req
  ) as Record<string, unknown> | undefined;

  const page = toPositiveInt(query?.page, 1);
  const rawLimit = toPositiveInt(query?.limit, DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, page: number, limit: number): PageMeta {
  const safeTotal = Math.max(0, Number.isFinite(total) ? total : 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasMore: page * limit < safeTotal,
  };
}
