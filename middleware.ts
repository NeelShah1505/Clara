/**
 * middleware.ts
 *
 * Next.js Edge Middleware — runs on every request before it hits a Route Handler
 * or Server Component. This is the outermost security layer.
 *
 * Responsibilities (in order):
 *   1. IP rate limiting  — pre-auth, per-IP sliding window (in-memory)
 *   2. Auth gate         — redirect unauthenticated users to /login
 *   3. Admin gate        — redirect non-admin users away from /admin/*
 *   4. Security headers  — injected on every response
 *
 * Note on Admin detection in middleware:
 *   Edge Middleware cannot use the Firebase Admin SDK (no Node.js runtime).
 *   Instead we do a lightweight JWT decode (no signature verification) just to
 *   read the `admin` custom claim for the redirect decision. The REAL enforcement
 *   of admin access happens server-side in requireAdmin() inside each API Route
 *   Handler — never rely on this middleware alone for security.
 */

import { NextRequest, NextResponse } from "next/server";
import { ipRateLimitCheck } from "@/lib/server/ipRateLimit";

// ── Route matchers ─────────────────────────────────────────────────────────────

/** Routes that require an authenticated session */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/wallets",
  "/categories",
  "/budgets",
  "/subscriptions",
  "/recurring",
  "/goals",
  "/analytics",
  "/calendar",
  "/reports",
  "/settings",
  "/admin",
];

/** Routes that require admin: true custom claim */
const ADMIN_PREFIXES = ["/admin"];

/** Auth API routes — stricter IP rate limit */
const AUTH_API_PREFIX = "/api/auth";

// ── Security response headers ─────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options":    "nosniff",
  "X-Frame-Options":            "DENY",
  "X-XSS-Protection":          "1; mode=block",
  "Referrer-Policy":            "strict-origin-when-cross-origin",
  "Permissions-Policy":         "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security":  "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ── Lightweight JWT claim reader (no signature verification) ──────────────────
// Used ONLY for admin redirect decisions in Edge Middleware.
// Real enforcement is in requireAdmin() in each Route Handler.

function readAdminClaimUnsafe(sessionCookie: string): boolean {
  try {
    const parts = sessionCookie.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return payload["admin"] === true;
  } catch {
    return false;
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── 1. IP rate limiting ────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const isAuthRoute = pathname.startsWith(AUTH_API_PREFIX);
  const allowed = ipRateLimitCheck(ip, isAuthRoute);

  if (!allowed) {
    return addSecurityHeaders(
      new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }

  // ── 2. Auth gate ───────────────────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const sessionCookie = request.cookies.get("__session")?.value;

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ── 3. Admin gate ──────────────────────────────────────────────────────────
  const isAdminRoute = ADMIN_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isAdminRoute && sessionCookie) {
    const isAdmin = readAdminClaimUnsafe(sessionCookie);
    if (!isAdmin) {
      // Authenticated but not admin — redirect to app dashboard
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
  }

  // ── 4. Pass through with security headers ──────────────────────────────────
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static (Next.js build output)
     *   - _next/image  (image optimisation)
     *   - favicon.ico
     *   - Public static files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
