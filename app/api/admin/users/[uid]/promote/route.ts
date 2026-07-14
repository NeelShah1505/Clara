/**
 * app/api/admin/users/[uid]/promote/route.ts
 *
 * POST   /api/admin/users/[uid]/promote — grant admin: true custom claim
 * DELETE /api/admin/users/[uid]/promote — revoke admin claim (demote)
 *
 * After setting custom claims, the user's existing session cookie will not
 * reflect the new claims until they sign in again. This is acceptable for
 * an admin panel — the promoted user must refresh their session.
 *
 * Requires admin: true custom claim.
 * An admin cannot demote themselves.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const POST = withAdmin(async (_request: NextRequest, auth, context) => {
  const targetUid = context?.params?.["uid"];
  if (!targetUid) {
    return NextResponse.json({ error: "Missing uid." }, { status: 400 });
  }

  const [authAdmin, db] = [getAdminAuth(), getAdminDb()];

  // Merge with any existing custom claims
  const existing = (await authAdmin.getUser(targetUid)).customClaims ?? {};
  await authAdmin.setCustomUserClaims(targetUid, { ...existing, admin: true });

  // Audit log in Firestore
  await db.collection("admin/auditLog/entries").add({
    action:    "promote",
    targetUid,
    by:        auth.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true, action: "promoted", uid: targetUid });
});

export const DELETE = withAdmin(
  async (_request: NextRequest, auth, context) => {
    const params = await context?.params;
    const targetUid = params?.["uid"];
    if (!targetUid) {
      return NextResponse.json({ error: "Missing uid." }, { status: 400 });
    }
    if (targetUid === auth.uid) {
      return NextResponse.json(
        { error: "You cannot demote your own account." },
        { status: 400 }
      );
    }

    const [authAdmin, db] = [getAdminAuth(), getAdminDb()];

    const existing = (await authAdmin.getUser(targetUid)).customClaims ?? {};
    const { admin: _removed, ...rest } = existing;
    await authAdmin.setCustomUserClaims(targetUid, rest);

    await db.collection("admin/auditLog/entries").add({
      action:    "demote",
      targetUid,
      by:        auth.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, action: "demoted", uid: targetUid });
  }
);
