import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import {
  browseClans,
  createClan,
  deleteClan,
  getClan,
  joinClan,
  kickMember,
  leaveClan,
  updateClan,
} from "./controller.js";
import {
  browseQuery,
  clanMemberParams,
  clanParams,
  createClanSchema,
  updateClanSchema,
} from "./schemas.js";

export const clansRouter = Router();

clansRouter.use(protect);

clansRouter.get("/", validate({ query: browseQuery }), asyncHandler(browseClans));
clansRouter.post("/", validate({ body: createClanSchema }), asyncHandler(createClan));
clansRouter.get("/:id", validate({ params: clanParams }), asyncHandler(getClan));
clansRouter.patch(
  "/:id",
  validate({ params: clanParams, body: updateClanSchema }),
  asyncHandler(updateClan),
);
clansRouter.delete("/:id", validate({ params: clanParams }), asyncHandler(deleteClan));
clansRouter.post("/:id/join", validate({ params: clanParams }), asyncHandler(joinClan));
clansRouter.post("/:id/leave", validate({ params: clanParams }), asyncHandler(leaveClan));
clansRouter.delete(
  "/:id/members/:memberId",
  validate({ params: clanMemberParams }),
  asyncHandler(kickMember),
);
