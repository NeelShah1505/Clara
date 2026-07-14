import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Financial Goals" };

const GOALS: any[] = [];

export default function GoalsPage() {
  const totalTarget = GOALS.reduce((s, g) => s + g.target, 0);
  const totalSaved = GOALS.reduce((s, g) => s + g.current, 0);
  const overallProgress = (totalSaved / totalTarget) * 100;

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Financial Goals</h1>
          <p>Track your progress towards your biggest aspirations</p>
        </div>
        <button className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>flag</span>
          Create Goal
        </button>
      </div>

      <div className="card reveal" style={{ marginBottom: "var(--gutter)", background: "var(--primary)", color: "#fff", border: "none" }}>
        <div className="flex-between" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Overall Progress</h2>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(overallProgress)}%</span>
        </div>
        <div className="progress-track" style={{ background: "rgba(255,255,255,0.15)", height: 10, marginBottom: "0.5rem" }}>
          <div className="progress-fill" style={{ width: `${overallProgress}%`, background: "var(--brand-green)" }} />
        </div>
        <div className="flex-between" style={{ color: "rgba(255,255,255,0.6)" }}>
          <span style={{ fontSize: 13 }}>₹{totalSaved.toLocaleString()} saved</span>
          <span style={{ fontSize: 13 }}>₹{totalTarget.toLocaleString()} target</span>
        </div>
      </div>

      {GOALS.length === 0 ? (
        <div className="empty-state">
          <span className="material-symbols-outlined">flag</span>
          <p>No financial goals yet. Create one to start saving!</p>
        </div>
      ) : (
        <div className="content-grid-2">
          {GOALS.map((g, i) => {
            const pct = Math.min((g.current / g.target) * 100, 100);
            const isDone = pct >= 100;
            return (
              <div key={g.id} className="card reveal" data-delay={`${(i % 2) * 100}` as "100" | "200"}>
                <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: g.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--primary)" }}>{isDone ? "emoji_events" : g.icon}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</h3>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Target: {g.date}</p>
                    </div>
                  </div>
                  {isDone ? (
                    <span className="badge badge-green">Completed</span>
                  ) : (
                    <button className="btn btn-ghost btn-icon"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span></button>
                  )}
                </div>
                <div className="progress-track" style={{ height: 8, marginBottom: "0.625rem" }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: isDone ? "var(--brand-green)" : g.color }} />
                </div>
                <div className="flex-between">
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--on-surface)" }}>₹{g.current.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>of ₹{g.target.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
