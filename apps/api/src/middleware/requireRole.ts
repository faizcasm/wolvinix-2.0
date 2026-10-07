import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../lib/errors.js";

/** Guards routes that only specific roles may touch (admin tooling, etc.). */
export function requireRole(...roles: Array<"user" | "admin">): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden("Insufficient permissions"));
      return;
    }
    next();
  };
}
