/**
 * lib/server/rateLimit.ts
 *
 * Server-side rate limiter for Next.js Route Handlers.
 *
 * This is the Route Handler counterpart to functions/src/middleware/rateLimit.ts.
 * Both use the same Firestore token-bucket pattern and the same starting limits
 * from security.md §5, so they share a single bucket doc per user.
 *
 * Limits:
 *   - transactionWrite:   60 / minute  / user
 *   - csvImport:           5 / hour    / user
 *   - reportGeneration:   10 / hour    / user
 *
 * On rate-limit breach: throws a NextResponse(429) with a generic message.
 * Callers should propagate it with `return` in their try/catch.
 */

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export type ActionKey = "transactionWrite" | "csvImport" | "reportGeneration";

interface LimitConfig {
  maxRequests: number;
  windowMs:    number;
}

const LIMITS: Record<ActionKey, LimitConfig> = {
  transactionWrite:  { maxRequests: 60,  windowMs: 60 * 1000      }, // 60/min
  csvImport:         { maxRequests: 5,   windowMs: 60 * 60 * 1000 }, // 5/hr
  reportGeneration:  { maxRequests: 10,  windowMs: 60 * 60 * 1000 }, // 10/hr
};

/**
 * Checks and increments the rate-limit counter for a given user + action.
 * Throws a NextResponse(429) if the limit is exceeded.
 * Returns void if the request is within limits.
 */
export async function assertRateLimit(
  uid: string,
  action: ActionKey
): Promise<void> {
  const db = getAdminDb();
  const bucketRef = db.doc(`users/${uid}/_meta/rateLimit`);
  const { maxRequests, windowMs } = LIMITS[action];
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(bucketRef);
      const data = snap.data() ?? {};

      const timestamps: number[] = ((data[action] as number[]) ?? []).filter(
        (t) => t > windowStart
      );

      if (timestamps.length >= maxRequests) {
        // Throw a plain Error inside the transaction — converted to NextResponse below
        throw new Error("RATE_LIMITED");
      }

      timestamps.push(now);
      tx.set(
        bucketRef,
        { [action]: timestamps, lastUpdated: FieldValue.serverTimestamp() },
        { merge: true }
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMITED") {
      // Return generic message per security.md §5 — don't leak limit numbers
      throw NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    throw err;
  }
}
