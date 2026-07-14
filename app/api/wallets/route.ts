/**
 * app/api/wallets/route.ts
 *
 * GET  /api/wallets  — list all wallets for the authenticated user
 * POST /api/wallets  — create a new wallet
 *
 * All mutations are rate-limited per security.md §5.
 * Balance is initialised to 0 (or openingBalance if provided, which is
 * recorded as a special "opening balance" income transaction).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { CreateWalletSchema } from "@/lib/validation/wallet";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Wallet } from "@/lib/types";

// ── GET /api/wallets ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const snapshot = await db
      .collection(`users/${uid}/wallets`)
      .orderBy("createdAt", "asc")
      .get();

    const wallets: Wallet[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id:        doc.id,
        name:      data.name,
        type:      data.type,
        balance:   data.balance ?? 0,
        currency:  data.currency,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() ??
                   (data.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    return NextResponse.json({ wallets });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/wallets]", err);
    return NextResponse.json({ error: "Failed to fetch wallets." }, { status: 500 });
  }
}

// ── POST /api/wallets ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    // Rate limit
    await assertRateLimit(uid, "transactionWrite");

    // Parse + validate body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { name, type, currency, openingBalance } = parsed.data;
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();

    // Create the wallet document
    const walletRef = db.collection(`users/${uid}/wallets`).doc();
    const walletData = {
      name,
      type,
      currency,
      balance:   openingBalance,
      createdAt: now,
      updatedAt: now,
    };
    await walletRef.set(walletData);

    // If an opening balance was provided, record it as an income transaction
    // so the balance is always derivable from transactions (reconciliation-safe)
    if (openingBalance && openingBalance !== 0) {
      const txRef = db.collection(`users/${uid}/transactions`).doc();
      await txRef.set({
        type:          openingBalance > 0 ? "income" : "expense",
        amount:        Math.abs(openingBalance),
        currency,
        walletId:      walletRef.id,
        categoryId:    "", // no category for opening balance
        merchant:      "Opening Balance",
        location:      "",
        notes:         "Auto-created when wallet was added.",
        tags:          [],
        receiptUrl:    "",
        date:          new Date().toISOString().slice(0, 10),
        paymentMethod: "other",
        isRecurring:   false,
        recurringRuleId: "",
        splitWith:     [],
        sharedExpenseGroupId: "",
        createdAt:     now,
        updatedAt:     now,
      });
    }

    return NextResponse.json(
      {
        wallet: {
          id:       walletRef.id,
          name,
          type,
          currency,
          balance:  openingBalance,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Wallet,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/wallets]", err);
    return NextResponse.json({ error: "Failed to create wallet." }, { status: 500 });
  }
}
