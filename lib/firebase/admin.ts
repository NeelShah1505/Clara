/**
 * lib/firebase/admin.ts
 *
 * Firebase ADMIN SDK — SERVER SIDE ONLY.
 *
 * Uses the modular firebase-admin v14 API.
 * This file must NEVER be imported in Client Components or bundled to the
 * browser. Next.js will automatically tree-shake it from the client bundle
 * because it's only used in Route Handlers, Server Actions, and Server
 * Components (which run on the server).
 *
 * Security (security.md §4):
 * - Service account credentials come from FIREBASE_SERVICE_ACCOUNT_JSON env var.
 * - In production, store this secret in Google Secret Manager and mount it
 *   at runtime — do NOT commit it or print it anywhere.
 */

import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      "[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON env var is not set. " +
        "See .env.local.example for setup instructions."
    );
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch {
    throw new Error(
      "[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. " +
        "Make sure the entire service account JSON is on a single line."
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
