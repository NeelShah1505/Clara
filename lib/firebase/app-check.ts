/**
 * lib/firebase/app-check.ts
 *
 * Firebase App Check initialisation using reCAPTCHA v3.
 *
 * IMPORTANT: Call initAppCheck() exactly ONCE, from a Client Component
 * (e.g. a <AppCheckProvider> wrapper around the root layout).
 * Do NOT call this in Server Components or Route Handlers — App Check
 * is a client-side attestation mechanism.
 *
 * Security: App Check ensures that only your real web app (identified by
 * the reCAPTCHA site key) can make requests to Firestore and Cloud Functions.
 * Requests from scripts, Postman, etc. will be rejected at the Firebase level.
 */

"use client";

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getApp } from "firebase/app";

let initialised = false;

export function initAppCheck(): void {
  if (initialised) return; // guard against double-init in React Strict Mode
  if (typeof window === "undefined") return; // server-guard — belt & suspenders

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;

  if (!siteKey) {
    // DEV-ONLY: Log a clear warning instead of silently failing.
    // In production this will cause App Check to fail, which is intentional —
    // shipping without App Check would violate security.md §5.
    console.warn(
      "[App Check] NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY is not set. " +
        "App Check is disabled. DO NOT ship this to production."
    );
    return;
  }

  initializeAppCheck(getApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    // isTokenAutoRefreshEnabled: keep tokens fresh without user interaction
    isTokenAutoRefreshEnabled: true,
  });

  initialised = true;
}
