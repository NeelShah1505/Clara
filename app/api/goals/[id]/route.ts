import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/goals/${id}`);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.targetAmount !== undefined) updates.targetAmount = body.targetAmount;
    if (body.currentAmount !== undefined) updates.currentAmount = body.currentAmount;
    if (body.color !== undefined) updates.color = body.color;
    if (body.targetDate !== undefined) updates.targetDate = body.targetDate;
    if (body.addFunds !== undefined) {
      updates.currentAmount = FieldValue.increment(Number(body.addFunds));
    }
    updates.updatedAt = FieldValue.serverTimestamp();

    await ref.update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Failed to update goal." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { id } = await params;
    const db = getAdminDb();
    await db.doc(`users/${uid}/goals/${id}`).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Failed to delete goal." }, { status: 500 });
  }
}
