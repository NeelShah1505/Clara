"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("comprehensive");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any[]>([]);

  const { data: txData } = useSWR("/api/transactions", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  const { data: walletData } = useSWR("/api/wallets", fetcher);
  const { format } = useCurrency();

  const transactions = txData?.transactions || [];
  const categories = catData?.categories || [];
  const wallets = walletData?.wallets || [];

  const filterTransactions = () => {
    let filtered = [...transactions];
    if (startDate) filtered = filtered.filter((t: any) => t.date >= startDate);
    if (endDate) filtered = filtered.filter((t: any) => t.date <= endDate);
    return filtered;
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find((c: any) => c.id === id);
    return cat ? cat.name : id || "Uncategorized";
  };

  const getWalletName = (id: string) => {
    const w = wallets.find((w: any) => w.id === id);
    return w ? w.name : id || "Unknown";
  };

  const generateCSV = (filtered: any[]) => {
    const headers = ["Date", "Type", "Merchant", "Category", "Wallet", "Amount", "Currency", "Notes"];
    const rows = filtered.map((t: any) => [
      t.date,
      t.type,
      t.merchant || "",
      getCategoryName(t.categoryId),
      getWalletName(t.walletId),
      t.amount,
      t.currency || "INR",
      t.notes || "",
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    // Summary
    const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    csv += "\n";
    csv += `"Total Income","${totalIncome}"\n`;
    csv += `"Total Expenses","${totalExpense}"\n`;
    csv += `"Net","${totalIncome - totalExpense}"\n`;

    return csv;
  };

  const generatePDFHTML = (filtered: any[]) => {
    const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    
    const rows = filtered.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.type}</td>
        <td>${t.merchant || "-"}</td>
        <td>${getCategoryName(t.categoryId)}</td>
        <td>${getWalletName(t.walletId)}</td>
        <td style="text-align:right;font-weight:bold;color:${t.type === 'income' ? '#065f46' : '#333'}">${t.type === 'income' ? '+' : '-'}${format(t.amount)}</td>
      </tr>
    `).join("");

    return `
      <html>
      <head><title>Clara Financial Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 2rem; color: #333; }
        h1 { color: #111; margin-bottom: 0.5rem; }
        .meta { color: #666; margin-bottom: 2rem; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        th { text-align: left; padding: 10px 12px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .summary { display: flex; gap: 2rem; margin-bottom: 2rem; }
        .summary-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; flex: 1; }
        .summary-label { font-size: 12px; color: #666; margin-bottom: 4px; }
        .summary-value { font-size: 24px; font-weight: 700; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Clara Financial Report</h1>
        <p class="meta">${startDate || 'All time'} — ${endDate || 'Present'} • ${filtered.length} transactions</p>
        <div class="summary">
          <div class="summary-card"><div class="summary-label">Total Income</div><div class="summary-value" style="color:#065f46">${format(totalIncome)}</div></div>
          <div class="summary-card"><div class="summary-label">Total Expenses</div><div class="summary-value" style="color:#9d174d">${format(totalExpense)}</div></div>
          <div class="summary-card"><div class="summary-label">Net</div><div class="summary-value">${format(totalIncome - totalExpense)}</div></div>
        </div>
        <table><thead><tr><th>Date</th><th>Type</th><th>Merchant</th><th>Category</th><th>Wallet</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </body></html>
    `;
  };

  const handleGenerate = () => {
    setGenerating(true);
    const filtered = filterTransactions();

    if (filtered.length === 0) {
      alert("No transactions found for the selected date range.");
      setGenerating(false);
      return;
    }

    if (exportFormat === "csv") {
      const csv = generateCSV(filtered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clara-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = generatePDFHTML(filtered);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    }

    setGenerated(prev => [
      { id: Date.now(), name: `${reportType} Report`, date: new Date().toLocaleDateString(), format: exportFormat, count: filtered.length },
      ...prev,
    ]);
    setGenerating(false);
  };

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Reports</h1>
          <p>Generate, view, and export your financial reports</p>
        </div>
      </div>

      <div className="content-grid-2-1" style={{ marginBottom: "var(--gutter)" }}>
        {/* Report Generator */}
        <div className="card reveal">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Custom Report</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label">Report Type</label>
              <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="comprehensive">Comprehensive Summary</option>
                <option value="income_expense">Income vs Expenses</option>
                <option value="category">Category Breakdown</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="input-group">
                <label className="input-label">Start Date</label>
                <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">End Date</label>
                <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Format</label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                  <input type="radio" name="format" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} /> CSV
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                  <input type="radio" name="format" checked={exportFormat === "pdf"} onChange={() => setExportFormat("pdf")} /> PDF (Print)
                </label>
              </div>
            </div>
            <button 
              className="btn btn-primary" type="button" 
              onClick={handleGenerate}
              disabled={generating}
              style={{ marginTop: "0.5rem" }}
            >
              {generating ? "Generating..." : "Generate & Download"}
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card reveal" data-delay="100" style={{ padding: 0 }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 className="text-headline-sm">Recent Exports</h2>
          </div>
          <div>
            {generated.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>folder_open</span>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No reports generated yet.</p>
              </div>
            ) : (
              generated.map((r) => (
                <div key={r.id} className="flex-between" style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--surface-container-low)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: r.format === "pdf" ? "var(--error)" : "var(--brand-green)" }}>
                        {r.format === "pdf" ? "picture_as_pdf" : "table_chart"}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</p>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{r.date} • {r.count} transactions • {r.format.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
