/**
 * lib/firebase/session.ts
 *
 * Server-side session cookie verification helper.
 *
 * Every Route Handler that requires authentication calls `requireAuth(request)`
 * at the top. It reads the `__session` HttpOnly cookie, verifies it with the
 * Admin SDK, and returns `{ uid, emailVerified, isAdmin }`.
 *
 * Security (security.md §3):
 *   - Email verification is enforced here as a second line of defence
 *     (primary enforcement is in Firestore security rules via isEmailVerified()).
 *   - Session cookie is verified with `checkRevoked: true` so revoked
 *     sessions (e.g., after password change) are rejected immediately.
 *   - Admin status is read from Firebase Custom Claims (`admin: true`).
 *     Never trust client-supplied headers for admin detection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export interface AuthContext {
  uid:           string;
  emailVerified: boolean;
  isAdmin:       boolean;
}

/**
 * Verifies the __session cookie and returns the authenticated user context.
 * Throws a NextResponse (401 or 403) if auth fails so callers can `return`
 * the thrown response directly.
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const sessionCookie = request.cookies.get("__session")?.value;

  if (!sessionCookie) {
    throw NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true /* checkRevoked */
    );

    // Enforce email verification (defence-in-depth on top of Firestore rules)
    if (!decoded.email_verified) {
      throw NextResponse.json(
        { error: "Email address must be verified before accessing this resource." },
        { status: 403 }
      );
    }

    return {
      uid:           decoded.uid,
      emailVerified: decoded.email_verified ?? false,
      isAdmin:       decoded["admin"] === true,
    };
  } catch (err) {
    // Re-throw NextResponse errors as-is (from email verification check above)
    if (err instanceof NextResponse) throw err;

    // Firebase Admin errors (expired, revoked, malformed)
    throw NextResponse.json(
      { error: "Session is invalid or has expired. Please sign in again." },
      { status: 401 }
    );
  }
}

/**
 * Like requireAuth, but also enforces admin: true custom claim.
 * Returns 403 for authenticated non-admin users.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (!auth.isAdmin) {
    throw NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Wraps a Route Handler with auth + error handling.
 * Catches thrown NextResponse objects and returns them directly.
 * Catches unexpected errors and returns a generic 500.
 *
 * Usage:
 *   export const GET = withAuth(async (request, { uid }) => {
 *     ...
 *     return NextResponse.json(data);
 *   });
 */
export function withAuth(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> => {
    try {
      const auth = await requireAuth(request);
      return await handler(request, auth, context);
    } catch (err) {
      if (err instanceof NextResponse) return err;
      console.error("[withAuth] Unhandled error:", err);
      return NextResponse.json(
        { error: "An unexpected error occurred." },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps a Route Handler with admin auth + error handling.
 * Only allows requests where the session carries `admin: true` custom claim.
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> => {
    try {
      const auth = await requireAdmin(request);
      return await handler(request, auth, context);
    } catch (err) {
      if (err instanceof NextResponse) return err;
      console.error("[withAdmin] Unhandled error:", err);
      return NextResponse.json(
        { error: "An unexpected error occurred." },
        { status: 500 }
      );
    }
  };
}
