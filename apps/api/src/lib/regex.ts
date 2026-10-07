/**
 * Escapes every character that has meaning inside a regular expression so that
 * user supplied search strings can never trigger ReDoS or alter the query.
 */
export function escapeRegExp(input: string): string {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
