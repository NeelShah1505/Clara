"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function GoalsPage() {
  const { data: goalsData, isLoading, mutate } = useSWR("/api/goals", fetcher);
  
  const { format } = useCurrency();
  const goals = goalsData?.goals || [];

  const [deleting, setDeleting] = useState<string | null>(null);
  const [addFundsGoal, setAddFundsGoal] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      mutate();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  const handleAddFunds = async (goalId: string) => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addFunds: amount }),
      });
      mutate();
      setAddFundsGoal(null);
      setAddFundsAmount("");
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Financial Goals</h1>
          <p>Track your savings targets</p>
        </div>
        <Link href="/goals/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Goal
        </Link>
      </div>

      <div className="card reveal">
        {isLoading ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
             <div className="spinner" style={{ margin: "0 auto 1rem" }} />
             <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Loading goals...</p>
           </div>
        ) : goals.length === 0 ? (
          <div style={{ padding: "4rem 0", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", marginBottom: "1rem" }}>flag</span>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: "0.5rem" }}>No goals set up</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: "1.5rem" }}>
              Start tracking your savings for a vacation, car, or emergency fund.
            </p>
            <Link href="/goals/new" className="btn btn-primary">Create a Goal</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {goals.map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) || 0;
              const isAddingFunds = addFundsGoal === goal.id;
              
              return (
                <div key={goal.id} style={{ 
                  padding: "1.25rem", 
                  background: `${goal.color}11`,
                  border: `1px solid ${goal.color}33`, 
                  borderRadius: "var(--radius-md)" 
                }}>
                  <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: goal.color }}>{goal.name}</h3>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: goal.color }}>{pct}%</span>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={() => handleDelete(goal.id)}
                        disabled={deleting === goal.id}
                        style={{ color: "var(--error)", padding: 4, height: 28, width: 28 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-between" style={{ marginBottom: "1rem", fontSize: 13, color: "var(--on-surface-variant)" }}>
                    <span style={{ fontWeight: 600, color: "var(--on-surface)" }}>{format(goal.currentAmount)} saved</span>
                    <span>Target: {format(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="progress-track" style={{ height: 8, marginBottom: "1rem" }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: goal.color, height: "100%" }} />
                  </div>
                  
                  {isAddingFunds ? (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                      <input 
                        type="number" className="input" placeholder="Amount" step="0.01"
                        value={addFundsAmount} onChange={(e) => setAddFundsAmount(e.target.value)}
                        style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: 13 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddFunds(goal.id)}>Add</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setAddFundsGoal(null); setAddFundsAmount(""); }}>✕</button>
                    </div>
                  ) : (
                    <div className="flex-between" style={{ marginTop: "1rem" }}>
                      {goal.targetDate ? (
                        <p style={{ fontSize: 12, color: "var(--on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</span>
                          Target: {goal.targetDate}
                        </p>
                      ) : <div />}
                      
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setAddFundsGoal(goal.id)}
                        style={{ padding: "0.25rem 0.75rem", fontSize: 12, height: "auto" }}
                      >
                        + Add Funds
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
