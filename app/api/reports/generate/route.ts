/**
 * app/api/reports/generate/route.ts
 *
 * POST /api/reports/generate
 *
 * Generates a PDF expense report for a date range using pdfkit.
 * Returns a binary PDF response with Content-Disposition: attachment.
 *
 * Rate limited: reportGeneration (10/hour/user — security.md §5).
 *
 * Request body:
 *   { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "walletId"?: string }
 *
 * PDF layout:
 *   1. Header — app name, user email, date range
 *   2. Summary — total income, total expense, net savings
 *   3. Category breakdown — name, amount, % of total expense
 *   4. Transactions table — date, merchant/description, category, amount
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod/v4";
import PDFDocument from "pdfkit";

// ── Input validation ──────────────────────────────────────────────────────────

const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Must be a valid calendar date");

const GenerateReportSchema = z.object({
  from:     DateStringSchema,
  to:       DateStringSchema,
  walletId: z.string().optional(),
}).refine((d) => d.from <= d.to, "from must be on or before to");

// ── Colours / layout constants ────────────────────────────────────────────────

const BRAND_COLOR  = "#4F46E5";  // indigo-600
const TEXT_COLOR   = "#111827";
const MUTED_COLOR  = "#6B7280";
const LINE_COLOR   = "#E5E7EB";
const RED_COLOR    = "#DC2626";
const GREEN_COLOR  = "#16A34A";
const PAGE_MARGIN  = 50;
const PAGE_WIDTH   = 595.28;     // A4
const CONTENT_W    = PAGE_WIDTH - PAGE_MARGIN * 2;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    await assertRateLimit(uid, "reportGeneration");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = GenerateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { from, to, walletId } = parsed.data;
    const db = getAdminDb();

    // ── Fetch data ────────────────────────────────────────────────────────────

    // User email for the header
    let userEmail = "";
    try {
      const userRecord = await getAdminAuth().getUser(uid);
      userEmail = userRecord.email ?? "";
    } catch { /* non-fatal */ }

    // Transactions in range
    let txQuery: FirebaseFirestore.Query = db
      .collection(`users/${uid}/transactions`)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .orderBy("date", "asc");

    if (walletId) {
      txQuery = db
        .collection(`users/${uid}/transactions`)
        .where("date", ">=", from)
        .where("date", "<=", to)
        .where("walletId", "==", walletId)
        .orderBy("date", "asc");
    }

    const txSnap = await txQuery.get();

    // Category lookup map
    const catSnap = await db.collection(`users/${uid}/categories`).get();
    const categories = new Map<string, string>(
      catSnap.docs.map((d) => [d.id, d.data().name as string])
    );

    // Aggregate
    let totalIncome  = 0;
    let totalExpense = 0;
    const categoryTotals = new Map<string, number>();

    const transactions = txSnap.docs.map((doc) => {
      const d      = doc.data();
      const amount = d.amount as number;
      const type   = d.type as "income" | "expense";

      if (type === "income")  totalIncome  += amount;
      if (type === "expense") {
        totalExpense += amount;
        const cid = (d.categoryId as string) || "__other__";
        categoryTotals.set(cid, (categoryTotals.get(cid) ?? 0) + amount);
      }

      return {
        date:      d.date as string,
        merchant:  (d.merchant as string) || "—",
        type,
        amount,
        categoryId: (d.categoryId as string) || "",
      };
    });

    const net = totalIncome - totalExpense;

    const categoryBreakdown = [...categoryTotals.entries()]
      .map(([cid, total]) => ({
        name: categories.get(cid) ?? cid,
        total,
        pct: totalExpense > 0 ? Math.round((total / totalExpense) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Build PDF ─────────────────────────────────────────────────────────────

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      // ── Header ──────────────────────────────────────────────────────────
      doc
        .fillColor(BRAND_COLOR)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Expense Report", PAGE_MARGIN, PAGE_MARGIN);

      doc
        .fillColor(MUTED_COLOR)
        .fontSize(10)
        .font("Helvetica")
        .text(`${userEmail}   |   ${from} → ${to}`, PAGE_MARGIN, PAGE_MARGIN + 28);

      hLine(doc, PAGE_MARGIN + 48);

      // ── Summary ─────────────────────────────────────────────────────────
      let y = PAGE_MARGIN + 62;
      doc
        .fillColor(TEXT_COLOR)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Summary", PAGE_MARGIN, y);

      y += 18;
      summaryRow(doc, y, "Total Income",  totalIncome,  GREEN_COLOR);   y += 16;
      summaryRow(doc, y, "Total Expense", totalExpense, RED_COLOR);     y += 16;
      summaryRow(doc, y, "Net Savings",   net,          net >= 0 ? GREEN_COLOR : RED_COLOR); y += 8;
      summaryRow(doc, y, "Transactions",  transactions.length, TEXT_COLOR, false); y += 8;

      hLine(doc, y + 8); y += 22;

      // ── Category Breakdown ───────────────────────────────────────────────
      if (categoryBreakdown.length > 0) {
        doc
          .fillColor(TEXT_COLOR)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Expense by Category", PAGE_MARGIN, y);

        y += 18;
        tableHeader(doc, y, ["Category", "Amount", "%"], [220, 100, 60]); y += 16;
        hLine(doc, y); y += 6;

        for (const { name, total, pct } of categoryBreakdown) {
          if (y > 740) { doc.addPage(); y = PAGE_MARGIN; }
          doc
            .fillColor(TEXT_COLOR).fontSize(10).font("Helvetica")
            .text(name,              PAGE_MARGIN,       y, { width: 220 })
            .text(fmt(total),        PAGE_MARGIN + 230, y, { width: 100, align: "right" })
            .text(`${pct}%`,         PAGE_MARGIN + 340, y, { width: 60,  align: "right" });
          y += 14;
        }

        hLine(doc, y + 4); y += 18;
      }

      // ── Transactions ─────────────────────────────────────────────────────
      doc
        .fillColor(TEXT_COLOR)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Transactions", PAGE_MARGIN, y);

      y += 18;
      tableHeader(doc, y, ["Date", "Description", "Category", "Amount"], [70, 160, 120, 80]); y += 16;
      hLine(doc, y); y += 6;

      for (const tx of transactions) {
        if (y > 740) { doc.addPage(); y = PAGE_MARGIN; }

        const color  = tx.type === "income" ? GREEN_COLOR : TEXT_COLOR;
        const prefix = tx.type === "income" ? "+" : "−";

        doc
          .fillColor(MUTED_COLOR).fontSize(9).font("Helvetica")
          .text(tx.date,                         PAGE_MARGIN,       y, { width: 70 });
        doc
          .fillColor(TEXT_COLOR).font("Helvetica")
          .text(tx.merchant.slice(0, 28),         PAGE_MARGIN + 75,  y, { width: 155 });
        doc
          .fillColor(MUTED_COLOR)
          .text(categories.get(tx.categoryId) ?? "—", PAGE_MARGIN + 235, y, { width: 115 });
        doc
          .fillColor(color).font("Helvetica-Bold")
          .text(`${prefix}${fmt(tx.amount)}`,    PAGE_MARGIN + 355, y, { width: 90, align: "right" });

        y += 14;
      }

      if (transactions.length === 0) {
        doc
          .fillColor(MUTED_COLOR).fontSize(10).font("Helvetica")
          .text("No transactions in this period.", PAGE_MARGIN, y);
      }

      // ── Footer ───────────────────────────────────────────────────────────
      const totalPages = (doc as unknown as { bufferedPageRange: () => { count: number } })
        .bufferedPageRange().count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc
          .fillColor(MUTED_COLOR).fontSize(8).font("Helvetica")
          .text(
            `Generated ${new Date().toUTCString()}   |   Page ${i + 1} of ${totalPages}`,
            PAGE_MARGIN, 820, { align: "center", width: CONTENT_W }
          );
      }

      doc.end();
    });

    const pdf = Buffer.concat(chunks);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="expense-report-${from}-${to}.pdf"`,
        "Content-Length":      String(pdf.length),
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/reports/generate]", err);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}

// ── PDF drawing helpers ───────────────────────────────────────────────────────

function hLine(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + CONTENT_W, y)
     .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
}

function summaryRow(
  doc:     PDFKit.PDFDocument,
  y:       number,
  label:   string,
  value:   number | string,
  color:   string,
  isMoney: boolean = true
): void {
  doc
    .fillColor(MUTED_COLOR).fontSize(10).font("Helvetica")
    .text(label, PAGE_MARGIN, y, { width: 200 });
  doc
    .fillColor(color).font("Helvetica-Bold")
    .text(
      isMoney ? fmt(value as number) : String(value),
      PAGE_MARGIN + 200, y,
      { width: 150, align: "right" }
    );
}

function tableHeader(
  doc:     PDFKit.PDFDocument,
  y:       number,
  cols:    string[],
  widths:  number[]
): void {
  doc.fillColor(MUTED_COLOR).fontSize(9).font("Helvetica-Bold");
  let x = PAGE_MARGIN;
  cols.forEach((col, i) => {
    doc.text(col, x, y, { width: widths[i] });
    x += widths[i]! + 5;
  });
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
