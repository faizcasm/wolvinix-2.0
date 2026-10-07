import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, type ErrorCode, zodFieldErrors } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export interface MappedError {
  status: number;
  body: {
    success: false;
    error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
  };
}

const GENERIC_INTERNAL_MESSAGE = "Something went wrong. Please try again later.";

interface ErrorLike {
  name?: string;
  message?: string;
  code?: unknown;
  path?: string;
  errors?: Record<string, { message?: string; path?: string }>;
  type?: string;
  statusCode?: number;
  status?: number;
}

function isMongooseValidationError(error: ErrorLike): boolean {
  return error.name === "ValidationError" && Boolean(error.errors);
}

function isCastError(error: ErrorLike): boolean {
  return error.name === "CastError" && typeof error.path === "string";
}

function isDuplicateKey(error: ErrorLike): boolean {
  return error.code === 11000 || (error.name === "MongoServerError" && error.code === 11000);
}

function isMulterError(error: ErrorLike): boolean {
  return error.name === "MulterError";
}

function isPayloadTooLarge(error: ErrorLike): boolean {
  return error.type === "entity.too.large";
}

/**
 * Pure error → envelope mapping (unit tested without express).
 * 5xx responses never expose the original message or stack.
 */
export function mapError(error: unknown): MappedError {
  if (error instanceof ApiError) {
    const internal = error.status >= 500;
    const body: MappedError["body"] = {
      success: false,
      error: {
        code: error.code,
        message: internal ? GENERIC_INTERNAL_MESSAGE : error.message,
      },
    };
    if (!internal && error.details) body.error.details = error.details;
    return { status: error.status, body };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: zodFieldErrors(error),
        },
      },
    };
  }

  const err = (error ?? {}) as ErrorLike;

  if (isMongooseValidationError(err)) {
    const details: Record<string, string> = {};
    for (const [path, issue] of Object.entries(err.errors ?? {})) {
      details[path] = issue?.message ?? "Invalid value";
    }
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
      },
    };
  }

  if (isCastError(err)) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid value supplied",
          details: { [String(err.path)]: "Invalid format" },
        },
      },
    };
  }

  if (isDuplicateKey(err)) {
    return {
      status: 409,
      body: { success: false, error: { code: "CONFLICT", message: "That value is already taken" } },
    };
  }

  if (isMulterError(err)) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 15 MB)" : "Unexpected upload error";
    return {
      status: 400,
      body: { success: false, error: { code: "VALIDATION_ERROR", message } },
    };
  }

  if (isPayloadTooLarge(err)) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Request payload is too large" },
      },
    };
  }

  return {
    status: 500,
    body: { success: false, error: { code: "INTERNAL", message: GENERIC_INTERNAL_MESSAGE } },
  };
}

/** 404 handler for unmatched routes. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

/** Global error handler — logs the real error, answers with the envelope. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, body } = mapError(error);
  const reqId = (req as unknown as { id?: string }).id;

  if (status >= 500) {
    logger.error({ err: error, reqId, method: req.method, url: req.originalUrl }, "request failed");
  } else {
    const err = (error ?? {}) as ErrorLike;
    logger.warn(
      {
        reqId,
        status,
        code: body.error.code,
        name: err.name,
        message: err.message,
        url: req.originalUrl,
      },
      "request rejected",
    );
  }

  res.status(status).json(body);
}
