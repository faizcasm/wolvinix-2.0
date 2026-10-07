import type { Request, Response } from "express";
import { isDbUp } from "../../config/database.js";

/** Liveness + DB readiness: `{ status, uptime, db }`. */
export async function health(_req: Request, res: Response): Promise<void> {
  const dbUp = isDbUp();
  const payload = {
    status: dbUp ? ("ok" as const) : ("degraded" as const),
    uptime: Math.round(process.uptime()),
    db: dbUp ? ("up" as const) : ("down" as const),
  };

  res.status(dbUp ? 200 : 503).json({ success: true, data: payload });
}
