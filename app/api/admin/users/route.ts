/**
 * app/api/admin/users/route.ts
 *
 * GET /api/admin/users?pageToken=&limit=50
 *
 * Lists all Firebase Auth users (paginated).
 * Requires admin: true custom claim.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminAuth } from "@/lib/firebase/admin";

export const GET = withAdmin(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const auth = getAdminAuth();
  const result = await auth.listUsers(limit, pageToken);

  const users = result.users.map((u) => ({
    uid:           u.uid,
    email:         u.email ?? null,
    displayName:   u.displayName ?? null,
    photoURL:      u.photoURL ?? null,
    emailVerified: u.emailVerified,
    disabled:      u.disabled,
    isAdmin:       u.customClaims?.["admin"] === true,
    createdAt:     u.metadata.creationTime,
    lastSignIn:    u.metadata.lastSignInTime,
  }));

  return NextResponse.json({
    users,
    nextPageToken: result.pageToken ?? null,
  });
});
