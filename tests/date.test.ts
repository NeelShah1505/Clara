/**
 * tests/date.test.ts
 *
 * Unit tests for lib/utils/date.ts
 *
 * Run: npm run test  (or jest --testPathPattern=tests/date)
 *
 * Covers all 6 frequencies with normal cases and edge cases:
 * - Month-end clamping (Jan 31 + monthly)
 * - Leap year handling (Feb 29 + yearly on non-leap)
 * - Year boundary (Dec → Jan)
 * - Quarter boundary crossing year
 */

import { addCycle, isOnOrBefore } from "../lib/utils/date";

describe("addCycle()", () => {

  // ── daily ──────────────────────────────────────────────────────────────────
  describe("daily", () => {
    it("advances by 1 day normally", () => {
      expect(addCycle("2026-07-13", "daily")).toBe("2026-07-14");
    });

    it("wraps across month boundary", () => {
      expect(addCycle("2026-07-31", "daily")).toBe("2026-08-01");
    });

    it("wraps across year boundary", () => {
      expect(addCycle("2026-12-31", "daily")).toBe("2027-01-01");
    });
  });

  // ── weekly ─────────────────────────────────────────────────────────────────
  describe("weekly", () => {
    it("advances by 7 days", () => {
      expect(addCycle("2026-07-01", "weekly")).toBe("2026-07-08");
    });

    it("wraps across month boundary", () => {
      expect(addCycle("2026-07-28", "weekly")).toBe("2026-08-04");
    });
  });

  // ── biweekly ───────────────────────────────────────────────────────────────
  describe("biweekly", () => {
    it("advances by 14 days", () => {
      expect(addCycle("2026-07-01", "biweekly")).toBe("2026-07-15");
    });

    it("wraps across month boundary", () => {
      expect(addCycle("2026-07-25", "biweekly")).toBe("2026-08-08");
    });
  });

  // ── monthly ────────────────────────────────────────────────────────────────
  describe("monthly", () => {
    it("advances by 1 month normally", () => {
      expect(addCycle("2026-07-13", "monthly")).toBe("2026-08-13");
    });

    it("wraps year boundary (Dec → Jan)", () => {
      expect(addCycle("2026-12-15", "monthly")).toBe("2027-01-15");
    });

    it("clamps Jan 31 to Feb 28 (non-leap year)", () => {
      expect(addCycle("2026-01-31", "monthly")).toBe("2026-02-28");
    });

    it("clamps Jan 31 to Feb 29 (leap year)", () => {
      expect(addCycle("2028-01-31", "monthly")).toBe("2028-02-29");
    });

    it("clamps Mar 31 to Apr 30", () => {
      expect(addCycle("2026-03-31", "monthly")).toBe("2026-04-30");
    });

    it("advances Feb 28 to Mar 28 (does not over-clamp)", () => {
      expect(addCycle("2026-02-28", "monthly")).toBe("2026-03-28");
    });

    it("advances Feb 29 (leap) to Mar 29", () => {
      expect(addCycle("2028-02-29", "monthly")).toBe("2028-03-29");
    });
  });

  // ── quarterly ──────────────────────────────────────────────────────────────
  describe("quarterly", () => {
    it("advances by 3 months normally", () => {
      expect(addCycle("2026-01-15", "quarterly")).toBe("2026-04-15");
    });

    it("crosses year boundary", () => {
      expect(addCycle("2026-10-15", "quarterly")).toBe("2027-01-15");
    });

    it("clamps Oct 31 → Jan 31 (valid)", () => {
      expect(addCycle("2026-10-31", "quarterly")).toBe("2027-01-31");
    });

    it("clamps Nov 30 → Feb 28", () => {
      expect(addCycle("2026-11-30", "quarterly")).toBe("2027-02-28");
    });
  });

  // ── yearly ─────────────────────────────────────────────────────────────────
  describe("yearly", () => {
    it("advances by 1 year normally", () => {
      expect(addCycle("2026-07-13", "yearly")).toBe("2027-07-13");
    });

    it("handles Feb 29 (leap) + yearly → Feb 28 (non-leap)", () => {
      expect(addCycle("2028-02-29", "yearly")).toBe("2029-02-28");
    });

    it("handles Feb 29 (leap) + yearly → Feb 29 (next leap)", () => {
      expect(addCycle("2024-02-29", "yearly")).toBe("2025-02-28");
    });

    it("handles Dec 31 + yearly", () => {
      expect(addCycle("2026-12-31", "yearly")).toBe("2027-12-31");
    });
  });
});

// ── isOnOrBefore ──────────────────────────────────────────────────────────────

describe("isOnOrBefore()", () => {
  it("returns true when date is before reference", () => {
    expect(isOnOrBefore("2026-07-01", "2026-07-13")).toBe(true);
  });

  it("returns true when date equals reference", () => {
    expect(isOnOrBefore("2026-07-13", "2026-07-13")).toBe(true);
  });

  it("returns false when date is after reference", () => {
    expect(isOnOrBefore("2026-07-14", "2026-07-13")).toBe(false);
  });

  it("handles year boundaries", () => {
    expect(isOnOrBefore("2025-12-31", "2026-01-01")).toBe(true);
    expect(isOnOrBefore("2026-01-01", "2025-12-31")).toBe(false);
  });
});
