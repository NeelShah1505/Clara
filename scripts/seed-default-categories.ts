/**
 * scripts/seed-default-categories.ts
 *
 * One-time seed script using modular firebase-admin v14 API.
 *
 * Usage:
 *   # Against emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx ts-node scripts/seed-default-categories.ts
 *
 *   # Against real project:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' npx ts-node scripts/seed-default-categories.ts
 */

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ── Init ──────────────────────────────────────────────────────────────────────

function initAdmin(): void {
  if (getApps().length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
    });
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: "test-expense-tracker" });
  } else {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIRESTORE_EMULATOR_HOST before running this script."
    );
  }
}

// ── Default category definitions ──────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",  icon: "🍔", color: "#FF6B6B" },
  { name: "Travel",         icon: "✈️", color: "#4ECDC4" },
  { name: "Shopping",       icon: "🛍️", color: "#45B7D1" },
  { name: "Health",         icon: "💊", color: "#96CEB4" },
  { name: "Bills",          icon: "📄", color: "#FFEAA7" },
  { name: "Entertainment",  icon: "🎬", color: "#DDA0DD" },
  { name: "Education",      icon: "📚", color: "#98D8C8" },
  { name: "Investment",     icon: "📈", color: "#F7DC6F" },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seedDefaultCategories(): Promise<void> {
  initAdmin();
  const db = getFirestore();

  console.log("Seeding default categories to _defaults/categories...");

  const batch = db.batch();

  for (const category of DEFAULT_CATEGORIES) {
    const id = category.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const ref = db.doc(`_defaults/categories/items/${id}`);
    batch.set(ref, {
      ...category,
      isDefault:  true,
      seededAt:   FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`✓ Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  process.exit(0);
}

seedDefaultCategories().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
