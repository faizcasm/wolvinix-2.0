/** Canonical id/string/date helpers shared by every serializer. */

export function toId(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const withId = value as { _id?: unknown; id?: unknown };
    if (withId._id !== undefined && withId._id !== null) return String(withId._id);
    if (withId.id !== undefined && withId.id !== null) return String(withId.id);
  }
  return String(value);
}

export function isoDate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** True when a mongoose reference was populated into a document/object. */
export function isPopulated(value: unknown, ...fields: string[]): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return fields.some((field) => record[field] !== undefined && record[field] !== null);
}
