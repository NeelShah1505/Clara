/**
 * app/api/auth/session/route.ts
 *
 * Session cookie Route Handler.
 *
 * POST /api/auth/session
 *   - Accepts a Firebase ID token from the client.
 *   - Verifies it with the Admin SDK.
 *   - Issues an HttpOnly, Secure, SameSite=Strict session cookie.
 *   - Allows Server Components and Route Handlers to read auth state
 *     without relying on client-side JavaScript.
 *
 * DELETE /api/auth/session
 *   - Clears the session cookie (sign-out for SSR-aware code).
 *
 * Rate limiting: max 20 session-creation requests per IP per 15 minutes
 * using an in-memory sliding-window counter. This is sufficient for a
 * personal app; upgrade to Redis or Firestore counter if traffic grows.
 *
 * Security notes:
 *   - Cookie is HttpOnly (not readable by JS), Secure (HTTPS only),
 *     SameSite=Strict (CSRF protection).
 *   - Session expiry mirrors Firebase's max allowed: 14 days.
 *   - We return generic error messages on rate limit — we don't leak limit
 *     numbers (security.md §5).
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Sliding-window: tracks request timestamps per IP over the last 15 minutes.
// NOTE: This resets on server restart and doesn't share state across multiple
// server instances. For multi-instance deployments, move to Redis/Firestore.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 20;

const ipWindows = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (ipWindows.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  ipWindows.set(ip, timestamps);
  return false;
}

// ── Session cookie config ─────────────────────────────────────────────────────

const SESSION_COOKIE_NAME = "__session"; // Firebase Hosting recognises this name
const SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (Firebase max)
const SESSION_EXPIRY_SECONDS = SESSION_EXPIRY_MS / 1000;

// ── POST — create session ─────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Parse body
  let idToken: string;
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken || typeof body.idToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid idToken." },
        { status: 400 }
      );
    }
    idToken = body.idToken;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Verify token and create session cookie
  try {
    const adminAuth = getAdminAuth();

    // Verify the ID token first — rejects expired / forged tokens
    const decoded = await adminAuth.verifyIdToken(idToken, true /* checkRevoked */);

    // Enforce email verification at the server boundary (defence-in-depth on
    // top of the Firestore security rule isEmailVerified()).
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email address is not verified." },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    const response = NextResponse.json({ status: "ok" }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    // Log server-side for observability but return a generic message to client
    console.error("[session/POST] Error creating session cookie:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authentication failed. Please sign in again." },
      { status: 401 }
    );
  }
}

// ── DELETE — clear session ────────────────────────────────────────────────────

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // expire immediately
    path: "/",
  });
  return response;
}
