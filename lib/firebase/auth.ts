/**
 * lib/firebase/auth.ts
 *
 * Auth helper functions and the useAuth React hook.
 *
 * All helpers work with the client SDK. The account-deletion flow calls a
 * Cloud Function so the server can recursively delete subcollections before
 * the Firebase Auth user is removed (security.md §3).
 *
 * Email verification is enforced here on sign-in: if a user signs in but
 * hasn't verified their email, we sign them out and throw a descriptive error
 * so the UI can prompt re-verification. This mirrors the Firestore security
 * rule enforcement (isEmailVerified()) — defence in depth.
 */

"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getClientAuth } from "./client";
import { useEffect, useState } from "react";

// ── Sign Up ───────────────────────────────────────────────────────────────────

/**
 * Creates a new account with email + password and immediately sends a
 * verification email. The user is signed in but write access to financial
 * data will be blocked by security rules until they verify.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getClientAuth();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  return user;
}

// ── Sign In ───────────────────────────────────────────────────────────────────

/**
 * Signs in with email + password.
 * Enforces email verification: unverified users are signed out immediately
 * and an error is thrown. This is defence-in-depth on top of the Firestore
 * security rule `isEmailVerified()`.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getClientAuth();
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  if (!user.emailVerified) {
    await firebaseSignOut(auth);
    const err = new Error(
      "EMAIL_NOT_VERIFIED: Please check your inbox and verify your email address before signing in."
    );
    err.name = "EmailNotVerifiedError";
    throw err;
  }

  return user;
}

/**
 * Signs in with Google (popup flow).
 * Google accounts are always considered verified.
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getClientAuth();
  const provider = new GoogleAuthProvider();
  // Request email scope explicitly
  provider.addScope("email");
  provider.addScope("profile");
  const { user } = await signInWithPopup(auth, provider);
  return user;
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const auth = getClientAuth();
  await firebaseSignOut(auth);
}

// ── Account Deletion ──────────────────────────────────────────────────────────

/**
 * Deletes the current user's account.
 *
 * Flow (per security.md §3 — hard delete, not a soft flag):
 *   1. Call the `deleteUserAccount` Cloud Function which:
 *      a. Recursively deletes all users/{uid}/... subcollections in Firestore.
 *      b. Deletes all users/{uid}/... files from Storage.
 *      c. Deletes the Firebase Auth user record.
 *   2. Signs out locally (auth state observer will update UI).
 *
 * The Cloud Function approach is necessary because Firestore subcollection
 * deletion requires the Admin SDK — it cannot be done from the client.
 */
export async function deleteAccount(): Promise<void> {
  const functions = getFunctions(getApp());
  const deleteUserAccountFn = httpsCallable(functions, "deleteUserAccount");
  await deleteUserAccountFn();
  // Auth state observer fires automatically after function deletes the auth user
}

// ── Resend verification email ─────────────────────────────────────────────────

export async function resendVerificationEmail(): Promise<void> {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  await sendEmailVerification(user);
}

// ── useAuth hook ──────────────────────────────────────────────────────────────

export interface AuthState {
  /** The currently signed-in Firebase user, or null if signed out. */
  user: User | null;
  /** True while Firebase resolves the initial auth state from cache. */
  loading: boolean;
}

/**
 * React hook that returns the current Firebase auth state.
 * Safe to call in any Client Component.
 *
 * @example
 * const { user, loading } = useAuth();
 * if (loading) return <Spinner />;
 * if (!user) return <SignInPage />;
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  return state;
}
