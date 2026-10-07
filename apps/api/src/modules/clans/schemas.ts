import { z } from "zod";
import { objectIdSchema, passthroughQuery } from "../../lib/schemas.js";

export const clanParams = z.object({ id: objectIdSchema });
export const clanMemberParams = z.object({ id: objectIdSchema, memberId: objectIdSchema });

export const browseQuery = passthroughQuery.extend({
  q: z.string().trim().max(60).optional(),
});

export const createClanSchema = z.object({
  name: z.string().trim().min(3, "Clan name must be at least 3 characters").max(40),
  description: z.string().trim().min(5, "Describe your clan").max(500),
  motto: z.string().trim().min(2, "A clan needs a motto").max(150),
  clanProfile: z.string().trim().url("clanProfile must be a valid URL").max(1000).optional(),
});

export const updateClanSchema = z
  .object({
    name: z.string().trim().min(3).max(40).optional(),
    description: z.string().trim().min(5).max(500).optional(),
    motto: z.string().trim().min(2).max(150).optional(),
    clanProfile: z.string().trim().url("clanProfile must be a valid URL").max(1000).optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.motto !== undefined ||
      value.clanProfile !== undefined,
    { message: "Provide at least one field to update" },
  );

export type CreateClanInput = z.infer<typeof createClanSchema>;
export type UpdateClanInput = z.infer<typeof updateClanSchema>;
