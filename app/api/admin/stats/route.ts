/**
 * app/api/admin/stats/route.ts
 *
 * GET /api/admin/stats
 *
 * Returns site-wide aggregate statistics for the admin dashboard.
 * Requires admin: true custom claim.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const GET = withAdmin(async (_request: NextRequest) => {
  const [auth, db] = [getAdminAuth(), getAdminDb()];

  // User count from Firebase Auth
  let userCount = 0;
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    userCount += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);

  // Aggregate stats from admin meta doc (kept up-to-date by Cloud Functions)
  const metaSnap = await db.doc("admin/meta").get();
  const meta = metaSnap.data() ?? {};

  return NextResponse.json({
    userCount,
    totalTransactions: meta.totalTransactions ?? 0,
    storageUsedMB:     meta.storageUsedMB ?? 0,
    updatedAt:         meta.updatedAt ?? null,
  });
});
