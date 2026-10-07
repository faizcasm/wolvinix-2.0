import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import {
  clearNotifications,
  deleteNotification,
  listNotifications,
  markAllRead,
  unreadCount,
} from "./controller.js";

const notificationParams = z.object({ id: objectIdSchema });

export const notificationsRouter = Router();

notificationsRouter.use(protect);

notificationsRouter.get(
  "/",
  validate({ query: passthroughQuery }),
  asyncHandler(listNotifications),
);
notificationsRouter.get("/unread-count", asyncHandler(unreadCount));
notificationsRouter.put("/read", asyncHandler(markAllRead));
notificationsRouter.delete("/", asyncHandler(clearNotifications));
notificationsRouter.delete(
  "/:id",
  validate({ params: notificationParams }),
  asyncHandler(deleteNotification),
);
