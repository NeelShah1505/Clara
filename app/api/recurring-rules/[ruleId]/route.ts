/**
 * app/api/recurring-rules/[ruleId]/route.ts
 *
 * GET    /api/recurring-rules/:id  — fetch a single rule
 * PATCH  /api/recurring-rules/:id  — update active, frequency, template, nextRunDate
 * DELETE /api/recurring-rules/:id  — delete the rule (existing transactions are kept)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { UpdateRecurringRuleSchema } from "@/lib/validation/recurringRule";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { RecurringRule } from "@/lib/types";

type Params = { params: Promise<{ ruleId: string }> };

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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { ruleId } = await params;

    const doc = await getAdminDb().doc(`users/${uid}/recurringRules/${ruleId}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Recurring rule not found." }, { status: 404 });
    }

    return NextResponse.json({ recurringRule: docToRule(doc) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/recurring-rules/:id]", err);
    return NextResponse.json({ error: "Failed to fetch recurring rule." }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { ruleId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateRecurringRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/recurringRules/${ruleId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Recurring rule not found." }, { status: 404 });
    }

    const { templateTransaction, ...topLevel } = parsed.data;

    // Flatten templateTransaction updates using dot-notation so we do a
    // partial update (don't overwrite the whole sub-object)
    const updatePayload: Record<string, unknown> = {
      ...topLevel,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (templateTransaction) {
      for (const [k, v] of Object.entries(templateTransaction)) {
        if (v !== undefined) {
          updatePayload[`templateTransaction.${k}`] = v;
        }
      }
    }

    await ref.update(updatePayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[PATCH /api/recurring-rules/:id]", err);
    return NextResponse.json({ error: "Failed to update recurring rule." }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { ruleId } = await params;

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/recurringRules/${ruleId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Recurring rule not found." }, { status: 404 });
    }

    // Hard delete the rule. Existing transactions that were auto-created by
    // this rule are intentionally kept (they are real financial records).
    // We clear their recurringRuleId to decouple them from the deleted rule.
    const linkedTx = await db
      .collection(`users/${uid}/transactions`)
      .where("recurringRuleId", "==", ruleId)
      .get();

    const batch = db.batch();
    batch.delete(ref);
    for (const tx of linkedTx.docs) {
      batch.update(tx.ref, { recurringRuleId: "", updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[DELETE /api/recurring-rules/:id]", err);
    return NextResponse.json({ error: "Failed to delete recurring rule." }, { status: 500 });
  }
}
