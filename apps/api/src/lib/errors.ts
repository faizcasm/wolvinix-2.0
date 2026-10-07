import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  /** 5xx messages are never sent to the client — they are for logs only. */
  readonly expose: boolean;

  constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
    Error.captureStackTrace?.(this, ApiError);
  }

  static validation(message = "Validation failed", details?: Record<string, unknown>) {
    return new ApiError(STATUS_BY_CODE.VALIDATION_ERROR, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "You must be signed in to do that") {
    return new ApiError(STATUS_BY_CODE.UNAUTHORIZED, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have permission to do that") {
    return new ApiError(STATUS_BY_CODE.FORBIDDEN, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(STATUS_BY_CODE.NOT_FOUND, "NOT_FOUND", message);
  }

  static conflict(message = "Resource already exists", details?: Record<string, unknown>) {
    return new ApiError(STATUS_BY_CODE.CONFLICT, "CONFLICT", message, details);
  }

  static rateLimited(message = "Too many requests, please try again later") {
    return new ApiError(STATUS_BY_CODE.RATE_LIMITED, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(STATUS_BY_CODE.INTERNAL, "INTERNAL", message);
  }
}

/** Wraps an async express handler so rejections reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

/** Flattens a ZodError into `{ "path.to.field": "message" }`. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}
