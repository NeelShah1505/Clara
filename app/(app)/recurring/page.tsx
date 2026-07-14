import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recurring" };

const RECURRING: any[] = [];

export default function RecurringPage() {
  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Recurring Transactions</h1>
          <p>Automate your expected income and bills</p>
        </div>
        <button className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Rule
        </button>
      </div>

      <div className="card reveal">
        {RECURRING.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">autorenew</span>
            <p>No recurring transactions. Set up rules for automatic tracking.</p>
          </div>
        ) : (
          <table className="clara-table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Frequency</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {RECURRING.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: r.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: r.color === "var(--primary)" ? "#fff" : "var(--primary)" }}>{r.icon}</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</p>
                        <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{r.category}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.frequency === "Monthly" ? "badge-blue" : "badge-yellow"}`}>{r.frequency}</span>
                  </td>
                  <td style={{ color: "var(--on-surface-variant)" }}>{r.date}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: r.isIncome ? "var(--brand-green)" : "var(--on-surface)" }}>
                    {r.isIncome ? "+" : ""}₹{r.amount.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-icon"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span></button>
                    <button className="btn btn-ghost btn-icon" style={{ color: "var(--error)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
