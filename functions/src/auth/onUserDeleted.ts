/**
 * functions/src/auth/onUserDeleted.ts
 *
 * Firebase Auth trigger: fires when a user account is deleted.
 *
 * Uses the firebase-functions v1 auth.user().onDelete() API because
 * firebase-functions v4 only exposes `identity.beforeUserCreated` (not
 * `beforeUserDeleted`) in its v2 namespace. The v1 trigger works alongside
 * v2 functions in the same deployment with no issues.
 *
 * Responsibility (security.md §3 — hard delete, not a soft flag):
 *   - Recursively deletes all Firestore data under users/{uid}/
 *   - Deletes all Firebase Storage files under users/{uid}/
 *
 * This trigger also acts as a safety net for the deleteUserAccount
 * callable function — if that function fails mid-way, this catches it.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as functions from "firebase-functions"; // v1 for auth triggers

if (getApps().length === 0) initializeApp();

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  functions.logger.info(`[onUserDeleted] Starting cleanup for uid=${uid}`);

  const db = getFirestore();

  // ── 1. Delete all Firestore data under users/{uid} ────────────────────────
  try {
    const userDocRef = db.doc(`users/${uid}`);
    await db.recursiveDelete(userDocRef);
    functions.logger.info(`[onUserDeleted] Firestore data deleted for uid=${uid}`);
  } catch (err) {
    functions.logger.error(
      `[onUserDeleted] Failed to delete Firestore data for uid=${uid}`,
      err
    );
  }

  // ── 2. Delete all Storage files under users/{uid}/ ────────────────────────
  try {
    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    functions.logger.info(`[onUserDeleted] Storage files deleted for uid=${uid}`);
  } catch (err) {
    functions.logger.error(
      `[onUserDeleted] Failed to delete Storage files for uid=${uid}`,
      err
    );
  }

  functions.logger.info(`[onUserDeleted] Cleanup complete for uid=${uid}`);
});
