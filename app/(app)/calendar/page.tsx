"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: txData } = useSWR("/api/transactions", fetcher);
  const { data: rulesData } = useSWR("/api/recurring-rules", fetcher);
  const { format } = useCurrency();

  const transactions = txData?.transactions || [];
  const rules = rulesData?.recurringRules || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Get days array for rendering
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Today
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(currentDate);

  // Group transactions by date
  const txByDate: Record<number, any[]> = {};
  transactions.forEach((tx: any) => {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() === year && txDate.getMonth() === month) {
      const d = txDate.getDate();
      if (!txByDate[d]) txByDate[d] = [];
      txByDate[d].push(tx);
    }
  });

  // Group recurring rules by date (estimated for this month)
  // For simplicity, we just look at nextRunDate or if frequency matches
  const rulesByDate: Record<number, any[]> = {};
  rules.forEach((rule: any) => {
    if (!rule.active) return;
    const runDate = new Date(rule.nextRunDate);
    // If it runs this month
    if (runDate.getFullYear() === year && runDate.getMonth() === month) {
      const d = runDate.getDate();
      if (!rulesByDate[d]) rulesByDate[d] = [];
      rulesByDate[d].push(rule);
    }
  });

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Calendar</h1>
          <p>Your financial timeline at a glance</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-icon" onClick={handlePrevMonth}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="btn btn-secondary" style={{ padding: "0 1rem", minWidth: 140 }}>
            {monthName} {year}
          </button>
          <button className="btn btn-secondary btn-icon" onClick={handleNextMonth}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="card reveal" style={{ padding: "1rem" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)", 
          gap: "1px", 
          background: "rgba(0,0,0,0.05)", 
          border: "1px solid rgba(0,0,0,0.05)", 
          borderRadius: "var(--radius-lg)", 
          overflow: "hidden" 
        }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ background: "var(--surface)", padding: "0.5rem", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--on-surface-variant)" }}>
              {d}
            </div>
          ))}
          
          {/* Empty days for offset */}
          {emptyDays.map(d => (
            <div key={`empty-${d}`} style={{ background: "var(--surface)", minHeight: 120, opacity: 0.5 }} />
          ))}

          {/* Days */}
          {days.map(d => {
            const isToday = isCurrentMonth && d === todayDate;
            const dayTxs = txByDate[d] || [];
            const dayRules = rulesByDate[d] || [];

            const totalIncome = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
            const totalExpense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

            // Construct full date string for link
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            return (
              <div key={d} className="hover-bg-container-low" style={{ 
                background: isToday ? "var(--surface-container-lowest)" : "var(--surface)", 
                minHeight: 120, 
                padding: "0.5rem", 
                display: "flex", 
                flexDirection: "column",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: 500, 
                    display: "inline-flex", 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    alignItems: "center", 
                    justifyContent: "center",
                    background: isToday ? "var(--brand-pink)" : "transparent",
                    color: isToday ? "var(--primary)" : "var(--on-surface-variant)" 
                  }}>
                    {d}
                  </span>
                  
                  <Link href={`/transactions/new?date=${dateStr}`} className="btn-icon" style={{ padding: 4, opacity: 0.5 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  </Link>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, overflowY: "auto" }}>
                  {totalIncome > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#065f46", background: "var(--brand-green)", padding: "2px 6px", borderRadius: 4, opacity: 0.8 }}>
                      +{format(totalIncome)}
                    </div>
                  )}
                  {totalExpense > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--on-surface)", background: "var(--brand-pink)", padding: "2px 6px", borderRadius: 4, opacity: 0.8 }}>
                      -{format(totalExpense)}
                    </div>
                  )}
                  {dayRules.map(rule => (
                    <div key={rule.id} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 2, color: "var(--brand-blue)", background: "rgba(64,152,255,0.1)", padding: "2px 4px", borderRadius: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>autorenew</span>
                      {rule.templateTransaction.merchant || "Auto"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
