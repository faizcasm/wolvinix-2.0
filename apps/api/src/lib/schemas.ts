import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/**
 * Common `?page=&limit=` shape. Unknown query keys are preserved so route
 * specific filters (q, tag, …) survive; numeric clamping lives in
 * `lib/pagination.ts`.
 */
export const passthroughQuery = z
  .object({
    page: z.unknown().optional(),
    limit: z.unknown().optional(),
  })
  .passthrough();
