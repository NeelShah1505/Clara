/**
 * lib/firebase/client.ts
 *
 * Firebase CLIENT SDK initialisation (browser / client components only).
 * Uses a lazy singleton pattern so the app is only initialised once even
 * if this module is imported from multiple places.
 *
 * DO NOT import firebase-admin here — it must stay server-side only.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  type FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";
import { connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ── Singleton init ────────────────────────────────────────────────────────────
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// ── Exported service accessors ────────────────────────────────────────────────

let _auth: Auth | null = null;
export function getClientAuth(): Auth {
  if (!_auth) {
    const app = getFirebaseApp();
    _auth = getAuth(app);

    // Connect to emulator in development when env var is set
    if (
      process.env.FIREBASE_AUTH_EMULATOR_HOST &&
      process.env.NODE_ENV !== "production"
    ) {
      connectAuthEmulator(
        _auth,
        `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
        { disableWarnings: false }
      );
    }
  }
  return _auth;
}

let _db: Firestore | null = null;
export function getClientDb(): Firestore {
  if (!_db) {
    const app = getFirebaseApp();
    _db = getFirestore(app);

    if (
      process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.NODE_ENV !== "production"
    ) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
      connectFirestoreEmulator(_db, host, Number(port));
    }
  }
  return _db;
}

let _storage: FirebaseStorage | null = null;
export function getClientStorage(): FirebaseStorage {
  if (!_storage) {
    const app = getFirebaseApp();
    _storage = getStorage(app);

    if (
      process.env.FIREBASE_STORAGE_EMULATOR_HOST &&
      process.env.NODE_ENV !== "production"
    ) {
      const [host, port] =
        process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(":");
      connectStorageEmulator(_storage, host, Number(port));
    }
  }
  return _storage;
}
