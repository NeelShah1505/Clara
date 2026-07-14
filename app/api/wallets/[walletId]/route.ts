/**
 * app/api/wallets/[walletId]/route.ts
 *
 * GET    /api/wallets/:id  — fetch a single wallet
 * PATCH  /api/wallets/:id  — update name / type / currency (not balance)
 * DELETE /api/wallets/:id  — delete wallet (blocked if it has transactions)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { UpdateWalletSchema } from "@/lib/validation/wallet";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Wallet } from "@/lib/types";

type Params = { params: Promise<{ walletId: string }> };

// ── GET /api/wallets/:id ──────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { walletId } = await params;
    const db = getAdminDb();

    const doc = await db.doc(`users/${uid}/wallets/${walletId}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const data = doc.data()!;
    const wallet: Wallet = {
      id:        doc.id,
      name:      data.name,
      type:      data.type,
      balance:   data.balance ?? 0,
      currency:  data.currency,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() ??
                 (data.createdAt as Timestamp).toDate().toISOString(),
    };

    return NextResponse.json({ wallet });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/wallets/:id]", err);
    return NextResponse.json({ error: "Failed to fetch wallet." }, { status: 500 });
  }
}

// ── PATCH /api/wallets/:id ────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { walletId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const db = getAdminDb();
    const walletRef = db.doc(`users/${uid}/wallets/${walletId}`);

    const existing = await walletRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    // Note: balance is NOT updatable via this endpoint.
    // It is maintained automatically by transaction writes.
    await walletRef.update({
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[PATCH /api/wallets/:id]", err);
    return NextResponse.json({ error: "Failed to update wallet." }, { status: 500 });
  }
}

// ── DELETE /api/wallets/:id ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { walletId } = await params;
    const db = getAdminDb();

    const walletRef = db.doc(`users/${uid}/wallets/${walletId}`);
    const existing = await walletRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    // Block deletion if any transactions reference this wallet
    const linkedTx = await db
      .collection(`users/${uid}/transactions`)
      .where("walletId", "==", walletId)
      .limit(1)
      .get();

    if (!linkedTx.empty) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a wallet that has transactions. " +
            "Re-assign or delete all transactions first.",
        },
        { status: 409 }
      );
    }

    await walletRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[DELETE /api/wallets/:id]", err);
    return NextResponse.json({ error: "Failed to delete wallet." }, { status: 500 });
  }
}
