import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const snapshot = await db.collection(`users/${uid}/goals`).get();
    
    const goals = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        targetAmount: d.targetAmount,
        currentAmount: d.currentAmount,
        targetDate: d.targetDate,
        color: d.color,
      };
    });

    return NextResponse.json({ goals });
  } catch (err) {
    console.error("[GET /api/goals]", err);
    return NextResponse.json({ error: "Failed to fetch goals." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const body = await request.json();

    const { name, targetAmount, targetDate, color } = body;
    if (!name || !targetAmount) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const db = getAdminDb();
    const ref = db.collection(`users/${uid}/goals`).doc();
    
    await ref.set({
      name,
      targetAmount,
      currentAmount: 0,
      targetDate: targetDate || null,
      color: color || "#3b82f6",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: ref.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/goals]", err);
    return NextResponse.json({ error: "Failed to create goal." }, { status: 500 });
  }
}
