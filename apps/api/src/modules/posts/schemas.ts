import { z } from "zod";
import { MAX_POST_LENGTH } from "../../models/post.js";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";

const textSchema = z.string().trim().min(1, "Text is required").max(MAX_POST_LENGTH);

export const postParams = z.object({ id: objectIdSchema });
export const replyParams = z.object({ id: objectIdSchema, replyId: objectIdSchema });
export const usernameParams = z.object({ username: z.string().trim().min(1).max(30) });
export const hashtagParams = z.object({ tag: z.string().trim().min(1).max(40) });
export const listQuery = passthroughQuery;

export const createPostSchema = z
  .object({
    text: textSchema,
    mediaUrl: z.string().trim().url("mediaUrl must be a valid URL").max(1000).optional(),
    mediaType: z.enum(["image", "video", "none"]).optional(),
    tags: z.array(objectIdSchema).max(20, "Too many tagged users").optional(),
  })
  .passthrough();

export const updatePostSchema = z
  .object({
    text: textSchema.optional(),
    mediaUrl: z.string().trim().url("mediaUrl must be a valid URL").max(1000).optional(),
    mediaType: z.enum(["image", "video", "none"]).optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.text !== undefined || value.mediaUrl !== undefined || value.mediaType !== undefined,
    { message: "Provide at least one field to update" },
  );

export const replySchema = z.object({ text: textSchema });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
