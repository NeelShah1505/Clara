/**
 * lib/utils/date.ts
 *
 * Pure date-arithmetic utilities for the recurring engine.
 *
 * All functions operate on ISO 8601 date strings ("YYYY-MM-DD") and
 * return date strings. No external dependencies — pure JS Date arithmetic.
 *
 * Design notes:
 * - "monthly" advancement clamps to the last day of the target month so
 *   Jan 31 + monthly → Feb 28 (or 29 on leap years), not Mar 3.
 * - All functions treat dates as UTC midnight to avoid timezone surprises
 *   when comparing "today" against stored date strings.
 * - Functions are exported individually so they tree-shake in both Next.js
 *   Route Handlers (browser bundle excluded) and Cloud Functions.
 */

export type Frequency   = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";

// ── Core: advance a date by one cycle ────────────────────────────────────────

/**
 * Advances a date string by one occurrence of the given frequency/cycle.
 *
 * @param dateStr  "YYYY-MM-DD" input date
 * @param cycle    frequency or billing cycle string
 * @returns        "YYYY-MM-DD" advanced date
 *
 * @example
 * addCycle("2026-01-31", "monthly")  // → "2026-02-28"
 * addCycle("2026-02-28", "monthly")  // → "2026-03-28"
 * addCycle("2026-12-01", "yearly")   // → "2027-12-01"
 */
export function addCycle(dateStr: string, cycle: Frequency | BillingCycle): string {
  const [year, month, day] = dateStr.split("-").map(Number) as [number, number, number];

  switch (cycle) {
    case "daily":
      return formatDate(new Date(Date.UTC(year, month - 1, day + 1)));

    case "weekly":
      return formatDate(new Date(Date.UTC(year, month - 1, day + 7)));

    case "biweekly":
      return formatDate(new Date(Date.UTC(year, month - 1, day + 14)));

    case "monthly": {
      // month is 1-indexed (e.g. 1 = Jan, 12 = Dec).
      // Target 0-indexed month = month (same value, because +1 month - 1 offset = 0).
      // Last day of target: Date.UTC(year, targetIdx+1, 0) where targetIdx = month.
      // e.g. Jan(1)+monthly: targetIdx=1, Date.UTC(y,2,0) = last day of Feb ✓
      const targetIdx      = month; // 0-indexed target month
      const lastDayOfTarget = new Date(Date.UTC(year, targetIdx + 1, 0)).getUTCDate();
      const targetDay       = Math.min(day, lastDayOfTarget);
      return formatDate(new Date(Date.UTC(year, targetIdx, targetDay)));
    }

    case "quarterly": {
      // +3 months: 0-indexed target = (month - 1) + 3 = month + 2
      const targetIdx       = month + 2; // 0-indexed target month
      const lastDayOfTarget = new Date(Date.UTC(year, targetIdx + 1, 0)).getUTCDate();
      const targetDay       = Math.min(day, lastDayOfTarget);
      return formatDate(new Date(Date.UTC(year, targetIdx, targetDay)));
    }

    case "yearly": {
      // Handle Feb 29 on leap years: Feb 29 + yearly on non-leap → Feb 28
      const targetYear = year + 1;
      const lastDayOfTarget = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
      const targetDay = Math.min(day, lastDayOfTarget);
      return formatDate(new Date(Date.UTC(targetYear, month - 1, targetDay)));
    }

    default: {
      const _exhaustive: never = cycle;
      throw new Error(`Unknown cycle: ${_exhaustive}`);
    }
  }
}

// ── Comparison helpers ────────────────────────────────────────────────────────

/**
 * Returns true if dateStr is on or before referenceStr.
 * Both must be "YYYY-MM-DD". Safe for string comparison (lexicographic).
 *
 * @example
 * isOnOrBefore("2026-07-01", "2026-07-13")  // → true
 * isOnOrBefore("2026-07-13", "2026-07-13")  // → true
 * isOnOrBefore("2026-07-14", "2026-07-13")  // → false
 */
export function isOnOrBefore(dateStr: string, referenceStr: string): boolean {
  return dateStr <= referenceStr;
}

/**
 * Returns today's date as a "YYYY-MM-DD" string in UTC.
 */
export function todayUTC(): string {
  return formatDate(new Date());
}

/**
 * Returns tomorrow's date as a "YYYY-MM-DD" string in UTC.
 */
export function tomorrowUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return formatDate(d);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
