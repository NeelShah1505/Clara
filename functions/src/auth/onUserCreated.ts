/**
 * functions/src/auth/onUserCreated.ts
 *
 * Firebase Auth trigger: fires when a new user account is created.
 * Uses firebase-functions v1 auth trigger because v2 blocking triggers
 * require Google Cloud Identity Platform to be enabled.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions";

if (getApps().length === 0) initializeApp();

// ── Default categories (context.md §3.12) ─────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",   icon: "🍔", color: "#FF6B6B", isDefault: true },
  { name: "Travel",          icon: "✈️", color: "#4ECDC4", isDefault: true },
  { name: "Shopping",        icon: "🛍️", color: "#45B7D1", isDefault: true },
  { name: "Health",          icon: "💊", color: "#96CEB4", isDefault: true },
  { name: "Bills",           icon: "📄", color: "#FFEAA7", isDefault: true },
  { name: "Entertainment",   icon: "🎬", color: "#DDA0DD", isDefault: true },
  { name: "Education",       icon: "📚", color: "#98D8C8", isDefault: true },
  { name: "Investment",      icon: "📈", color: "#F7DC6F", isDefault: true },
];

// ── Trigger ────────────────────────────────────────────────────────────────────

export const onUserAccountCreated = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  functions.logger.info(`[onUserCreated] Seeding data for uid=${uid}`);

  const db = getFirestore();
  const batch = db.batch();

  // ── Profile document ───────────────────────────────────────────────────────
  const profileRef = db.doc(`users/${uid}`);
  batch.set(profileRef, {
    displayName: user.displayName ?? "",
    email:       user.email ?? "",
    currency:    "USD",
    timezone:    "UTC",
    language:    "en",
    theme:       "system",
    createdAt:   FieldValue.serverTimestamp(),
  });

  // ── Default categories ─────────────────────────────────────────────────────
  for (const category of DEFAULT_CATEGORIES) {
    const categoryRef = db.collection(`users/${uid}/categories`).doc();
    batch.set(categoryRef, {
      ...category,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // ── Default "Cash" wallet ─────────────────────────────────────────────────
  const walletRef = db.collection(`users/${uid}/wallets`).doc();
  batch.set(walletRef, {
    name:      "Cash",
    type:      "cash",
    balance:   0,
    currency:  "USD",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  functions.logger.info(
    `[onUserCreated] Seeded profile, ${DEFAULT_CATEGORIES.length} categories, ` +
    `and 1 wallet for uid=${uid}`
  );
});
