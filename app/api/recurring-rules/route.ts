/**
 * app/api/recurring-rules/route.ts
 *
 * GET  /api/recurring-rules  — list all recurring rules (?active=true to filter)
 * POST /api/recurring-rules  — create a new recurring rule
 *
 * nextRunDate defaults to tomorrow (UTC) if not provided so the rule
 * doesn't fire immediately on creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { CreateRecurringRuleSchema } from "@/lib/validation/recurringRule";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { tomorrowUTC } from "@/lib/utils/date";
import type { RecurringRule } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function docToRule(doc: FirebaseFirestore.DocumentSnapshot): RecurringRule {
  const d = doc.data()!;
  const ts = (t: unknown) =>
    (t as Timestamp)?.toDate().toISOString() ?? new Date().toISOString();
  return {
    id:                  doc.id,
    active:              d.active ?? true,
    frequency:           d.frequency,
    nextRunDate:         d.nextRunDate,
    templateTransaction: d.templateTransaction,
    createdAt:           ts(d.createdAt),
    updatedAt:           ts(d.updatedAt),
  };
}

// ── GET /api/recurring-rules ──────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const activeFilter = new URL(request.url).searchParams.get("active");

    let query: FirebaseFirestore.Query = db
      .collection(`users/${uid}/recurringRules`)
      .orderBy("createdAt", "desc");

    if (activeFilter === "true")  query = query.where("active", "==", true);
    if (activeFilter === "false") query = query.where("active", "==", false);

    const snapshot = await query.get();
    const rules: RecurringRule[] = snapshot.docs.map(docToRule);

    return NextResponse.json({ recurringRules: rules });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/recurring-rules]", err);
    return NextResponse.json({ error: "Failed to fetch recurring rules." }, { status: 500 });
  }
}

// ── POST /api/recurring-rules ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    await assertRateLimit(uid, "transactionWrite");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateRecurringRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { frequency, nextRunDate, templateTransaction } = parsed.data;
    const db = getAdminDb();

    // Verify wallet and category exist
    const [walletSnap, categorySnap] = await Promise.all([
      db.doc(`users/${uid}/wallets/${templateTransaction.walletId}`).get(),
      db.doc(`users/${uid}/categories/${templateTransaction.categoryId}`).get(),
    ]);

    if (!walletSnap.exists) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }
    if (!categorySnap.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const firstRunDate = nextRunDate ?? tomorrowUTC();
    const now = FieldValue.serverTimestamp();
    const ref = db.collection(`users/${uid}/recurringRules`).doc();

    await ref.set({
      active:              true,
      frequency,
      nextRunDate:         firstRunDate,
      templateTransaction,
      createdAt:           now,
      updatedAt:           now,
    });

    return NextResponse.json(
      {
        recurringRule: {
          id:                  ref.id,
          active:              true,
          frequency,
          nextRunDate:         firstRunDate,
          templateTransaction,
          createdAt:           new Date().toISOString(),
          updatedAt:           new Date().toISOString(),
        } satisfies RecurringRule,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/recurring-rules]", err);
    return NextResponse.json({ error: "Failed to create recurring rule." }, { status: 500 });
  }
}
