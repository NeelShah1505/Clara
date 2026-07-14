/**
 * app/api/admin/settings/route.ts
 *
 * GET  /api/admin/settings  — read site-level feature flags
 * POST /api/admin/settings  — write site-level feature flags
 *
 * Feature flags are stored in Firestore at admin/settings.
 * The client reads these on startup to toggle features dynamically.
 * Requires admin: true custom claim for both reads and writes.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/firebase/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { sanitizeBody } from "@/lib/server/sanitize";

const SETTINGS_REF = "admin/settings";

// Allowed flag names — only these keys may be written
const ALLOWED_FLAGS = new Set([
  "maintenanceMode",
  "signupsEnabled",
  "csvImportEnabled",
  "pdfReportsEnabled",
  "analyticsEnabled",
  "fcmEnabled",
]);

export const GET = withAdmin(async () => {
  const db = getAdminDb();
  const snap = await db.doc(SETTINGS_REF).get();
  return NextResponse.json(snap.data() ?? {});
});

export const POST = withAdmin(async (request: NextRequest) => {
  const db = getAdminDb();
  const raw = await request.json();
  const body = sanitizeBody(raw) as Record<string, unknown>;

  // Only persist known flag keys — drop anything unexpected
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FLAGS.has(key) && typeof body[key] === "boolean") {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid flags provided. Accepted keys: " + [...ALLOWED_FLAGS].join(", ") },
      { status: 400 }
    );
  }

  await db.doc(SETTINGS_REF).set(updates, { merge: true });
  return NextResponse.json({ updated: updates });
});
