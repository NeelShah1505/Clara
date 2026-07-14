/**
 * app/api/admin/users/[uid]/route.ts
 *
 * GET /api/admin/users/[uid]
 *
 * Returns full profile for a specific user: Auth record + Firestore user doc.
 * Requires admin: true custom claim.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const GET = withAdmin(
  async (_request: NextRequest, _auth, context) => {
    const params = await context?.params;
    const uid = params?.["uid"];
    if (!uid) {
      return NextResponse.json({ error: "Missing uid." }, { status: 400 });
    }

    const [authAdmin, db] = [getAdminAuth(), getAdminDb()];

    const [userRecord, profileSnap] = await Promise.all([
      authAdmin.getUser(uid),
      db.doc(`users/${uid}`).get(),
    ]);

    return NextResponse.json({
      uid:           userRecord.uid,
      email:         userRecord.email ?? null,
      displayName:   userRecord.displayName ?? null,
      photoURL:      userRecord.photoURL ?? null,
      emailVerified: userRecord.emailVerified,
      disabled:      userRecord.disabled,
      isAdmin:       userRecord.customClaims?.["admin"] === true,
      createdAt:     userRecord.metadata.creationTime,
      lastSignIn:    userRecord.metadata.lastSignInTime,
      profile:       profileSnap.data() ?? null,
    });
  }
);
