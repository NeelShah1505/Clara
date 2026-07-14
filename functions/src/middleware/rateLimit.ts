/**
 * functions/src/middleware/rateLimit.ts
 *
 * Token-bucket rate limiter backed by Firestore.
 * Uses modular firebase-admin v14 API.
 *
 * Each user has a rate-limit bucket stored at:
 *   users/{uid}/_meta/rateLimit
 *
 * Starting limits (security.md §5):
 *   - transactionWrite:    60 / minute  / user
 *   - csvImport:            5 / hour    / user
 *   - reportGeneration:    10 / hour    / user
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

// ── Configuration ─────────────────────────────────────────────────────────────

export type ActionKey = "transactionWrite" | "csvImport" | "reportGeneration";

interface LimitConfig {
  maxRequests: number;
  windowMs:    number;
}

const LIMITS: Record<ActionKey, LimitConfig> = {
  transactionWrite:  { maxRequests: 60,  windowMs: 60 * 1000      },
  csvImport:         { maxRequests: 5,   windowMs: 60 * 60 * 1000 },
  reportGeneration:  { maxRequests: 10,  windowMs: 60 * 60 * 1000 },
};

// ── Rate limit enforcement ────────────────────────────────────────────────────

export async function assertRateLimit(
  uid: string,
  action: ActionKey
): Promise<void> {
  const db = getFirestore();
  const bucketRef = db.doc(`users/${uid}/_meta/rateLimit`);
  const { maxRequests, windowMs } = LIMITS[action];
  const now = Date.now();
  const windowStart = now - windowMs;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bucketRef);
    const data = snap.data() ?? {};

    const timestamps: number[] = (data[action] as number[] ?? []).filter(
      (t) => t > windowStart
    );

    if (timestamps.length >= maxRequests) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later."
      );
    }

    timestamps.push(now);

    tx.set(
      bucketRef,
      { [action]: timestamps, lastUpdated: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
}
