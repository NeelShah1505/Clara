import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Calendar</h1>
          <p>Your financial timeline at a glance</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-icon"><span className="material-symbols-outlined">chevron_left</span></button>
          <button className="btn btn-secondary" style={{ padding: "0 1rem" }}>July 2025</button>
          <button className="btn btn-secondary btn-icon"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>

      <div className="card reveal" style={{ padding: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ background: "var(--surface-container-lowest)", padding: "0.5rem", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--on-surface-variant)" }}>
              {d}
            </div>
          ))}
          
          {/* Empty days for offset */}
          <div style={{ background: "var(--surface-container-lowest)", minHeight: 100 }} />
          <div style={{ background: "var(--surface-container-lowest)", minHeight: 100 }} />

          {/* Days */}
          {days.map(d => (
            <div key={d} style={{ background: "var(--surface-container-lowest)", minHeight: 100, padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: d === 15 ? "var(--primary)" : "var(--on-surface-variant)" }}>
                {d === 15 ? <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: "50%", background: "var(--brand-pink)", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>{d}</span> : d}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
