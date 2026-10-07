import type { Request, Response } from "express";
import { ApiError } from "../../lib/errors.js";
import { parsePagination } from "../../lib/pagination.js";
import { ok, paginated } from "../../lib/response.js";
import {
  NOTIFICATION_POPULATE,
  Notification,
  toNotificationJson,
} from "../../models/notification.js";

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);
  const filter = { recipient: req.user._id };

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .populate(NOTIFICATION_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  paginated(
    res,
    notifications.map((item) => toNotificationJson(item)),
    total,
    page,
    limit,
  );
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const count = await Notification.countDocuments({ recipient: req.user._id, seen: false });
  ok(res, { count });
}

/** Marks the *current user's* notifications as seen (the old one used a broken id). */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  const result = await Notification.updateMany(
    { recipient: req.user._id, seen: false },
    { $set: { seen: true } },
  );
  ok(res, { ok: true, updated: result.modifiedCount });
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (!deleted) throw ApiError.notFound("Notification not found");
  ok(res, { ok: true });
}

export async function clearNotifications(req: Request, res: Response): Promise<void> {
  await Notification.deleteMany({ recipient: req.user._id });
  ok(res, { ok: true });
}
