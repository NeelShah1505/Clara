"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const { data: txData } = useSWR("/api/transactions", fetcher);
  const { data: rulesData } = useSWR("/api/recurring-rules", fetcher);
  const { data: subData } = useSWR("/api/subscriptions", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  const { format } = useCurrency();

  const transactions = txData?.transactions || [];
  const rules = rulesData?.recurringRules || [];
  const subscriptions = subData?.subscriptions || [];
  const categories = catData?.categories || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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

  // Group recurring rules by date
  const rulesByDate: Record<number, any[]> = {};
  rules.forEach((rule: any) => {
    if (!rule.active) return;
    const runDate = new Date(rule.nextRunDate);
    if (runDate.getFullYear() === year && runDate.getMonth() === month) {
      const d = runDate.getDate();
      if (!rulesByDate[d]) rulesByDate[d] = [];
      rulesByDate[d].push(rule);
    }
  });

  // Group subscriptions by due date
  const subsByDate: Record<number, any[]> = {};
  subscriptions.forEach((sub: any) => {
    const dueDate = new Date(sub.nextDueDate);
    if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
      const d = dueDate.getDate();
      if (!subsByDate[d]) subsByDate[d] = [];
      subsByDate[d].push(sub);
    }
  });

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getCatName = (id: string) => categories.find((c: any) => c.id === id)?.name || "Other";

  // Selected day details
  const selectedDayTxs = selectedDay ? txByDate[selectedDay] || [] : [];
  const selectedDayRules = selectedDay ? rulesByDate[selectedDay] || [] : [];
  const selectedDaySubs = selectedDay ? subsByDate[selectedDay] || [] : [];

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

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "var(--gutter)", alignItems: "flex-start" }}>
        {/* Calendar grid */}
        <div className="card reveal" style={{ padding: "1rem" }}>
          <div style={{ 
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", 
            background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)", 
            borderRadius: "var(--radius-lg)", overflow: "hidden" 
          }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ background: "var(--surface)", padding: "0.5rem", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--on-surface-variant)" }}>
                {d}
              </div>
            ))}
            
            {emptyDays.map(d => (
              <div key={`empty-${d}`} style={{ background: "var(--surface)", minHeight: 90, opacity: 0.5 }} />
            ))}

            {days.map(d => {
              const isToday = isCurrentMonth && d === todayDate;
              const isSelected = selectedDay === d;
              const dayTxs = txByDate[d] || [];
              const dayRules = rulesByDate[d] || [];
              const daySubs = subsByDate[d] || [];
              const hasActivity = dayTxs.length > 0 || dayRules.length > 0 || daySubs.length > 0;

              const totalIncome = dayTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
              const totalExpense = dayTxs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);

              return (
                <div 
                  key={d} 
                  onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                  style={{ 
                    background: isSelected ? "var(--surface-container-lowest)" : isToday ? "rgba(255,200,200,0.15)" : "var(--surface)", 
                    minHeight: 110, padding: "0.4rem", 
                    display: "flex", flexDirection: "column",
                    cursor: "pointer",
                    outline: isSelected ? "2px solid var(--brand-blue)" : "none",
                    outlineOffset: -2,
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ 
                    fontSize: 13, fontWeight: 500, 
                    display: "inline-flex", width: 24, height: 24, borderRadius: "50%", 
                    alignItems: "center", justifyContent: "center",
                    background: isToday ? "var(--brand-pink)" : "transparent",
                    color: isToday ? "#fff" : "var(--on-surface-variant)" 
                  }}>
                    {d}
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, flex: 1, overflow: "hidden" }}>
                    {totalIncome > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#065f46", background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>
                        +{format(totalIncome)}
                      </div>
                    )}
                    {totalExpense > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#9d174d", background: "#fce7f3", padding: "1px 4px", borderRadius: 3 }}>
                        -{format(totalExpense)}
                      </div>
                    )}
                    {daySubs.length > 0 && (
                      <div style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "1px 4px", borderRadius: 3 }}>
                        {daySubs.length} bill{daySubs.length > 1 ? "s" : ""}
                      </div>
                    )}
                    {dayRules.length > 0 && (
                      <div style={{ fontSize: 10, color: "#0369a1", background: "#e0f2fe", padding: "1px 4px", borderRadius: 3 }}>
                        {dayRules.length} auto
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card reveal" data-delay="100">
          {selectedDay ? (
            <>
              <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>
                {monthName} {selectedDay}, {year}
              </h2>

              {/* Quick add actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <Link href={`/transactions/new?date=${dateStr(selectedDay)}`} className="btn btn-primary btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Transaction
                </Link>
                <Link href="/subscriptions/new" className="btn btn-secondary btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>subscriptions</span> Subscription
                </Link>
                <Link href="/recurring/new" className="btn btn-secondary btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>autorenew</span> Recurring
                </Link>
              </div>

              {/* Transactions */}
              {selectedDayTxs.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Transactions</h3>
                  {selectedDayTxs.map((tx: any) => (
                    <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{tx.merchant || "Transaction"}</p>
                        <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{getCatName(tx.categoryId)}</p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: tx.type === "income" ? "#065f46" : "var(--on-surface)" }}>
                        {tx.type === "income" ? "+" : "-"}{format(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Subscriptions */}
              {selectedDaySubs.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Bills Due</h3>
                  {selectedDaySubs.map((s: any) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{format(s.amount)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recurring rules */}
              {selectedDayRules.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Recurring</h3>
                  {selectedDayRules.map((r: any) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{r.templateTransaction?.merchant || "Recurring"}</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{format(r.templateTransaction?.amount || 0)}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedDayTxs.length === 0 && selectedDaySubs.length === 0 && selectedDayRules.length === 0 && (
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No activity on this day. Use the buttons above to add something!</p>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>touch_app</span>
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Click on a day to see details and add activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
