import { z } from "zod";
import { passthroughQuery } from "../../lib/schemas.js";

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_.]+$/, "Username may only contain letters, numbers, dots and underscores")
      .optional(),
    bio: z.string().trim().max(300).optional(),
    profilePic: z.string().trim().max(2000).optional(),
    password: z.string().min(6).max(128).optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.username !== undefined ||
      value.bio !== undefined ||
      value.profilePic !== undefined ||
      value.password !== undefined,
    { message: "Provide at least one field to update" },
  );

export const freezeSchema = z.object({ frozen: z.boolean() });

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(5).max(2000),
});

export const searchQuerySchema = passthroughQuery.extend({
  q: z.string().trim().min(1, "Search query is required").max(60),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
