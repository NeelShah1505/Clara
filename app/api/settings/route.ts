import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();
    const auth = getAdminAuth();

    // Fetch user details from Auth to merge if Settings don't have them
    const userRecord = await auth.getUser(uid);

    const doc = await db.doc(`users/${uid}/settings/preferences`).get();
    
    // Default settings
    let settings = { 
      baseCurrency: "INR",
      displayCurrency: "INR",
      theme: "dark",
      notifications: true,
      name: userRecord.displayName || "",
      email: userRecord.email || "",
      profilePic: userRecord.photoURL || "",
      claraEnabled: false,
      claraApiKey: "",
      claraMcpUrl: "",
      calendarSyncEnabled: false,
      webhookUrl: "",
    };

    if (doc.exists) {
      settings = { ...settings, ...doc.data() };
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ settings: { baseCurrency: "INR", displayCurrency: "INR", claraEnabled: false, claraApiKey: "", claraMcpUrl: "" } }); 
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const body = await request.json();
    
    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/settings/preferences`);

    const updateData = {
      baseCurrency: body.baseCurrency || "INR",
      displayCurrency: body.displayCurrency || "INR",
      theme: body.theme || "dark",
      notifications: body.notifications !== undefined ? body.notifications : true,
      name: body.name || "",
      email: body.email || "",
      profilePic: body.profilePic || "",
      claraEnabled: body.claraEnabled === true,
      claraApiKey: body.claraApiKey || "",
      claraMcpUrl: body.claraMcpUrl || "",
      calendarSyncEnabled: body.calendarSyncEnabled === true,
      webhookUrl: body.webhookUrl || "",
    };

    await ref.set(updateData, { merge: true });

    // Update Auth Profile too if name/email changed
    const auth = getAdminAuth();
    await auth.updateUser(uid, {
      displayName: updateData.name,
    });

    return NextResponse.json({ settings: updateData });
  } catch (err) {
    console.error("[POST /api/settings]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
