"use strict";
/**
 * functions/src/utils/date.ts
 *
 * Pure date-arithmetic utilities for Cloud Functions.
 *
 * This is the authoritative copy for the functions sub-project.
 * The identical source lives at lib/utils/date.ts for Next.js Route Handlers.
 * Both copies are tested by tests/date.test.ts.
 *
 * Keep these two files in sync. If you change one, change the other.
 * (A monorepo / shared package setup can eliminate this duplication later.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCycle = addCycle;
exports.isOnOrBefore = isOnOrBefore;
exports.todayUTC = todayUTC;
exports.tomorrowUTC = tomorrowUTC;
/**
 * Advances a date string by one occurrence of the given frequency/cycle.
 */
function addCycle(dateStr, cycle) {
    const [year, month, day] = dateStr.split("-").map(Number);
    switch (cycle) {
        case "daily":
            return formatDate(new Date(Date.UTC(year, month - 1, day + 1)));
        case "weekly":
            return formatDate(new Date(Date.UTC(year, month - 1, day + 7)));
        case "biweekly":
            return formatDate(new Date(Date.UTC(year, month - 1, day + 14)));
        case "monthly": {
            const targetIdx = month; // 0-indexed target month (M+1 month, 0-indexed = M)
            const lastDayOfTarget = new Date(Date.UTC(year, targetIdx + 1, 0)).getUTCDate();
            const targetDay = Math.min(day, lastDayOfTarget);
            return formatDate(new Date(Date.UTC(year, targetIdx, targetDay)));
        }
        case "quarterly": {
            const targetIdx = month + 2; // 0-indexed: (month-1)+3 = month+2
            const lastDayOfTarget = new Date(Date.UTC(year, targetIdx + 1, 0)).getUTCDate();
            const targetDay = Math.min(day, lastDayOfTarget);
            return formatDate(new Date(Date.UTC(year, targetIdx, targetDay)));
        }
        case "yearly": {
            const targetYear = year + 1;
            const lastDayOfTarget = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
            const targetDay = Math.min(day, lastDayOfTarget);
            return formatDate(new Date(Date.UTC(targetYear, month - 1, targetDay)));
        }
        default:
            throw new Error(`Unknown cycle: ${cycle}`);
    }
}
/** Returns true if dateStr is on or before referenceStr (lexicographic comparison). */
function isOnOrBefore(dateStr, referenceStr) {
    return dateStr <= referenceStr;
}
/** Returns today's date as "YYYY-MM-DD" in UTC. */
function todayUTC() {
    return formatDate(new Date());
}
/** Returns tomorrow's date as "YYYY-MM-DD" in UTC. */
function tomorrowUTC() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return formatDate(d);
}
function formatDate(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
//# sourceMappingURL=date.js.map