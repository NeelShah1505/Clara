/**
 * lib/server/sanitize.ts
 *
 * Input sanitization helpers used by all POST/PATCH Route Handlers
 * before Zod validation runs.
 *
 * Why each step exists:
 *
 * 1. HTML stripping  — Defense-in-depth against stored XSS. React escapes
 *    output by default, but stripping tags at the API layer means even
 *    non-React consumers (PDF exports, email summaries) are safe.
 *
 * 2. Firestore injection — Firestore does not support SQL, so there is no
 *    SQL injection risk. However, Firestore field names that start with "$"
 *    or contain "." can break security rules or cause unexpected behaviour
 *    (e.g., a "$where" key). We strip these from user-supplied map keys.
 *
 * 3. Unicode normalization (NFC) — Prevents homoglyph attacks and ensures
 *    consistent string comparison (e.g. for duplicate-detection queries).
 *
 * 4. Whitespace trimming — Prevents " admin " matching "admin" differently
 *    in different comparison contexts.
 *
 * What this does NOT do:
 *   - Rate limiting  (lib/server/rateLimit.ts, lib/server/ipRateLimit.ts)
 *   - Schema validation (lib/validation/*)
 *   - Auth checks (lib/firebase/session.ts)
 */

/**
 * Sanitize a single string value.
 */
export function sanitizeString(value: string): string {
  return (
    value
      // 1. Strip HTML tags
      .replace(/<[^>]*>/g, "")
      // 2. Remove null bytes (can truncate strings in some renderers)
      .replace(/\0/g, "")
      // 3. Trim whitespace
      .trim()
      // 4. Normalize to NFC unicode form
      .normalize("NFC")
  );
}

/**
 * Recursively sanitize all string values in a plain object or array.
 * Keys that start with "$" or contain "." are removed from objects
 * (Firestore operator injection prevention).
 *
 * Non-string primitives (numbers, booleans, null) are passed through.
 */
export function sanitizeBody<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeString(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeBody) as unknown as T;
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Drop keys that could be Firestore operator injection
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      result[key] = sanitizeBody(val);
    }
    return result as unknown as T;
  }

  // number, boolean, null, undefined — return as-is
  return value;
}
