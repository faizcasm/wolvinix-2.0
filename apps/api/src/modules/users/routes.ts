import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { objectIdSchema } from "../../lib/schemas.js";
import { protect } from "../../middleware/protect.js";
import { contactLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import {
  contact,
  deleteMe,
  getFollowers,
  getFollowing,
  getMe,
  getProfile,
  getUserClans,
  searchUsers,
  suggested,
  toggleFollow,
  toggleFreeze,
  updateMe,
} from "./controller.js";
import { contactSchema, freezeSchema, searchQuerySchema, updateMeSchema } from "./schemas.js";

const idParams = z.object({ id: objectIdSchema });
const userIdParams = z.object({ userId: objectIdSchema });

export const usersRouter = Router();

// --- self -------------------------------------------------------------
usersRouter.get("/me", protect, asyncHandler(getMe));
usersRouter.patch("/me", protect, validate({ body: updateMeSchema }), asyncHandler(updateMe));
usersRouter.delete("/me", protect, asyncHandler(deleteMe));
usersRouter.post(
  "/me/freeze",
  protect,
  validate({ body: freezeSchema }),
  asyncHandler(toggleFreeze),
);

// --- discovery (static paths must precede `/:username`) ----------------
usersRouter.get("/suggested", protect, asyncHandler(suggested));
usersRouter.get(
  "/search",
  protect,
  validate({ query: searchQuerySchema }),
  asyncHandler(searchUsers),
);
usersRouter.get(
  "/clan/:userId",
  protect,
  validate({ params: userIdParams }),
  asyncHandler(getUserClans),
);

// --- connections -------------------------------------------------------
usersRouter.get(
  "/:id/followers",
  protect,
  validate({ params: idParams }),
  asyncHandler(getFollowers),
);
usersRouter.get(
  "/:id/following",
  protect,
  validate({ params: idParams }),
  asyncHandler(getFollowing),
);
usersRouter.post(
  "/:id/follow",
  protect,
  validate({ params: idParams }),
  asyncHandler(toggleFollow),
);

// --- profile -----------------------------------------------------------
usersRouter.get("/:username", protect, asyncHandler(getProfile));

// --- contact -----------------------------------------------------------
usersRouter.post(
  "/contact",
  contactLimiter,
  validate({ body: contactSchema }),
  asyncHandler(contact),
);
