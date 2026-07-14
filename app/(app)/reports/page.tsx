import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

const REPORTS: any[] = [];

export default function ReportsPage() {
  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Reports</h1>
          <p>Generate, view, and export your financial reports</p>
        </div>
        <button className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>post_add</span>
          Generate Report
        </button>
      </div>

      <div className="content-grid-2-1" style={{ marginBottom: "var(--gutter)" }}>
        {/* Report Generator */}
        <div className="card reveal">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Custom Report</h2>
          <form style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label">Report Type</label>
              <select className="input">
                <option>Comprehensive Summary</option>
                <option>Income vs Expenses</option>
                <option>Category Breakdown</option>
                <option>Tax Preparation</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="input-group">
                <label className="input-label">Start Date</label>
                <input type="date" className="input" />
              </div>
              <div className="input-group">
                <label className="input-label">End Date</label>
                <input type="date" className="input" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Format</label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="radio" name="format" defaultChecked /> PDF
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="radio" name="format" /> CSV
                </label>
              </div>
            </div>
            <button className="btn btn-primary" type="button" style={{ marginTop: "0.5rem" }}>Generate</button>
          </form>
        </div>

        {/* Recent Reports */}
        <div className="card reveal" data-delay="100" style={{ padding: 0 }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 className="text-headline-sm">Recent Archives</h2>
          </div>
          <div>
            {REPORTS.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>folder_open</span>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No reports generated yet.</p>
              </div>
            ) : (
              REPORTS.map((r) => (
                <div key={r.id} className="flex-between" style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--surface-container-low)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "var(--error)" }}>picture_as_pdf</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</p>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{r.date} • {r.size}</p>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon"><span className="material-symbols-outlined">download</span></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
