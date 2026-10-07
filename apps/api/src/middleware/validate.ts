import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError, zodFieldErrors } from "../lib/errors.js";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function assignQuery(req: Request, value: unknown): void {
  // `req.query` is accessor-like on some express versions — define an own
  // property so the parsed value is always readable afterwards.
  Object.defineProperty(req, "query", {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/** Validates request parts with zod; failures become a 400 ApiError. */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params ?? {});
        Object.defineProperty(req, "params", {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schemas.query) {
        assignQuery(req, schemas.query.parse(req.query ?? {}));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.validation("Validation failed", zodFieldErrors(error)));
        return;
      }
      next(error);
    }
  };
}
