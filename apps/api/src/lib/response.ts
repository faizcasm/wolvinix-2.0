import type { Response } from "express";
import type { ErrorCode } from "./errors.js";
import { buildMeta } from "./pagination.js";

export interface PageMetaShape {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PageMetaShape;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** `{ success: true, data }` (+ optional pagination meta) with HTTP 200. */
export function ok<T>(res: Response, data: T, meta?: PageMetaShape): Response {
  const body: SuccessEnvelope<T> = meta ? { success: true, data, meta } : { success: true, data };
  return res.status(200).json(body);
}

/** Same as `ok` but with HTTP 201. */
export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data } satisfies SuccessEnvelope<T>);
}

/** Paginated success: items in `data`, counts in `meta`. */
export function paginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
): Response {
  return ok(res, items, buildMeta(total, page, limit));
}

/** Error envelope — normally produced by the global error handler. */
export function fail(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const body: ErrorEnvelope = {
    success: false,
    error: details ? { code, message, details } : { code, message },
  };
  return res.status(status).json(body);
}
