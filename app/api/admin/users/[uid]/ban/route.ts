/**
 * app/api/admin/users/[uid]/ban/route.ts
 *
 * POST /api/admin/users/[uid]/ban   — disable the user's Firebase Auth account
 * DELETE /api/admin/users/[uid]/ban — re-enable (unban) the user
 *
 * Also writes a `banned` flag to Firestore so the client and security rules
 * can react to it immediately (Firestore rules check `request.auth.token.admin`
 * but we add this as belt-and-suspenders).
 *
 * Requires admin: true custom claim.
 * An admin cannot ban themselves.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const POST = withAdmin(async (request: NextRequest, auth, context) => {
  const params = await context?.params;
  const targetUid = params?.["uid"];
  if (!targetUid) {
    return NextResponse.json({ error: "Missing uid." }, { status: 400 });
  }
  if (targetUid === auth.uid) {
    return NextResponse.json(
      { error: "You cannot ban your own account." },
      { status: 400 }
    );
  }

  const [authAdmin, db] = [getAdminAuth(), getAdminDb()];
  await authAdmin.updateUser(targetUid, { disabled: true });
  await db.doc(`users/${targetUid}`).set(
    { banned: true, bannedAt: FieldValue.serverTimestamp(), bannedBy: auth.uid },
    { merge: true }
  );

  return NextResponse.json({ success: true, action: "banned", uid: targetUid });
});

export const DELETE = withAdmin(async (request: NextRequest, auth, context) => {
  const targetUid = context?.params?.["uid"];
  if (!targetUid) {
    return NextResponse.json({ error: "Missing uid." }, { status: 400 });
  }

  const [authAdmin, db] = [getAdminAuth(), getAdminDb()];
  await authAdmin.updateUser(targetUid, { disabled: false });
  await db.doc(`users/${targetUid}`).set(
    { banned: false, unbannedAt: FieldValue.serverTimestamp(), unbannedBy: auth.uid },
    { merge: true }
  );

  return NextResponse.json({ success: true, action: "unbanned", uid: targetUid });
});
