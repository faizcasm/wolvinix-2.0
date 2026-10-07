import { Notification, type CreateNotificationInput } from "../../models/notification.js";
import { emitToUser } from "../../sockets/index.js";

/**
 * Persists a notification and pushes it to the recipient's live sockets.
 * Self-notifications are skipped.
 */
export async function notify(input: CreateNotificationInput): Promise<void> {
  if (input.recipient && input.recipient === input.sender) return;
  try {
    const notification = await Notification.create({
      recipient: input.recipient,
      sender: input.sender,
      type: input.type,
      message: input.message ?? "",
      post: input.post ?? undefined,
    });
    emitToUser(String(input.recipient), "notification:new", {
      notification: {
        _id: String(notification._id),
        type: notification.type,
        message: notification.message,
        post: notification.post ? String(notification.post) : "",
        seen: false,
        sender: input.sender,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // A failed notification must never break the action that triggered it.
  }
}
