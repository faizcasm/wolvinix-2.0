import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import { createStat, deleteStat, getUserStats, leaderboard, updateStat } from "./controller.js";

const statParams = z.object({ id: objectIdSchema });
const userParams = z.object({ userId: objectIdSchema });

const createStatSchema = z.object({
  gameName: z.string().trim().min(1, "Game name is required").max(80),
  inGameName: z.string().trim().min(1, "In-game name is required").max(80),
  score: z.coerce.number().min(0, "Score cannot be negative"),
  level: z.coerce.number().int().min(0, "Level cannot be negative"),
});

const updateStatSchema = z
  .object({
    gameName: z.string().trim().min(1).max(80).optional(),
    inGameName: z.string().trim().min(1).max(80).optional(),
    score: z.coerce.number().min(0).optional(),
    level: z.coerce.number().int().min(0).optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.gameName !== undefined ||
      value.inGameName !== undefined ||
      value.score !== undefined ||
      value.level !== undefined,
    { message: "Provide at least one field to update" },
  );

export const statsRouter = Router();

statsRouter.use(protect);

// Static paths before `/:id`.
statsRouter.get(
  "/user/:userId",
  validate({ params: userParams, query: passthroughQuery }),
  asyncHandler(getUserStats),
);
statsRouter.get("/leaderboard", validate({ query: passthroughQuery }), asyncHandler(leaderboard));
statsRouter.post("/", validate({ body: createStatSchema }), asyncHandler(createStat));
statsRouter.patch(
  "/:id",
  validate({ params: statParams, body: updateStatSchema }),
  asyncHandler(updateStat),
);
statsRouter.delete("/:id", validate({ params: statParams }), asyncHandler(deleteStat));
