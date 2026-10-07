import { z } from "zod";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";

export const conversationParams = z.object({ id: objectIdSchema });

export const createConversationSchema = z.object({ userId: objectIdSchema });

export const sendMessageSchema = z
  .object({
    text: z.string().trim().min(1, "Message text is required").max(2000).optional(),
    imageUrl: z.string().trim().url("imageUrl must be a valid URL").max(1000).optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.text || value.imageUrl), {
    message: "A message needs text or an image",
  });

export const listQuery = passthroughQuery;

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
