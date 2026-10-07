/** Matches `#tag` only when the `#` is not glued to a word character. */
const HASHTAG_SOURCE = "(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,30})(?![A-Za-z0-9_])";

export const MAX_HASHTAGS_PER_POST = 10;

/**
 * Extracts, normalizes (lowercase, no leading `#`), dedupes and caps the
 * hashtags found in a piece of text.
 */
export function extractHashtags(text?: string | null): string[] {
  if (!text) return [];
  const pattern = new RegExp(HASHTAG_SOURCE, "g");
  const seen = new Set<string>();
  const tags: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const tag = match[1].toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_HASHTAGS_PER_POST) break;
  }
  return tags;
}

/**
 * Normalizes a single hashtag (e.g. a `:tag` route param).
 * Returns `null` when the value cannot be a valid hashtag.
 */
export function normalizeHashtag(tag?: string | null): string | null {
  if (typeof tag !== "string") return null;
  const cleaned = tag.trim().replace(/^#+/, "").toLowerCase();
  if (!cleaned || cleaned.length > 30 || !/^[a-z0-9_]+$/.test(cleaned)) return null;
  return cleaned;
}
