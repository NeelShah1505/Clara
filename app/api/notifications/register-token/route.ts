/**
 * app/api/notifications/register-token/route.ts
 *
 * POST /api/notifications/register-token
 *
 * Stores an FCM device token for the authenticated user.
 * Called by the client after the user grants notification permission.
 *
 * Tokens are stored at users/{uid}/fcmTokens/{tokenId}.
 * The token value is the unique key — if the same token is re-registered
 * (e.g., app refresh), it simply overwrites the existing doc with an
 * updated timestamp (idempotent).
 *
 * Security: tokens are write-only from the client; never returned by any
 * read endpoint. Only Cloud Functions (server-side) read them.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod/v4";

const RegisterTokenSchema = z.object({
  token:      z.string().min(1, "token is required").max(4096),
  deviceType: z.enum(["web", "android", "ios"]).optional().default("web"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = RegisterTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { token, deviceType } = parsed.data;
    const db = getAdminDb();

    // Use a deterministic doc ID based on the token hash so re-registration
    // is idempotent without a separate query.
    // We just use the token itself as the doc ID (tokens are globally unique).
    // Firestore doc IDs max 1500 bytes — FCM tokens are ~152 chars, well within limit.
    const tokenRef = db.doc(`users/${uid}/fcmTokens/${encodeURIComponent(token).slice(0, 1500)}`);

    await tokenRef.set({
      token,
      deviceType,
      registeredAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/notifications/register-token]", err);
    return NextResponse.json({ error: "Failed to register token." }, { status: 500 });
  }
}
