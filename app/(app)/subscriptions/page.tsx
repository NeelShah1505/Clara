"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function SubscriptionsPage() {
  const { data: subData, isLoading: subLoading } = useSWR("/api/subscriptions", fetcher);
  const { data: catData, isLoading: catLoading } = useSWR("/api/categories", fetcher);

  const subscriptions = subData?.subscriptions || [];
  const categories = catData?.categories || [];
  
  const { format } = useCurrency();

  const SUBS = subscriptions.map((s: any) => {
    const cat = categories.find((c: any) => c.id === s.categoryId) || { name: s.categoryId, icon: "receipt", color: "var(--brand-blue)" };
    return {
      id: s.id,
      name: s.name,
      cycle: s.billingCycle.charAt(0).toUpperCase() + s.billingCycle.slice(1),
      nextDate: s.nextDueDate,
      cost: s.amount,
      icon: cat.icon,
      color: cat.color,
    };
  });

  const isLoading = subLoading || catLoading;
  const monthlyTotal = SUBS.reduce((acc, s) => acc + (s.cycle === "Monthly" ? s.cost : s.cost / 12), 0);
  const yearlyTotal = monthlyTotal * 12;

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Subscriptions</h1>
          <p>Track your recurring costs and upcoming renewals</p>
        </div>
        <Link href="/subscriptions/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Subscription
        </Link>
      </div>

      <div className="stat-grid reveal" style={{ marginBottom: "var(--gutter)" }}>
        <div className="stat-card" style={{ background: "var(--surface-container-lowest)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="stat-card-label">Active Subscriptions</div>
          <div className="stat-card-value">{SUBS.length}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--brand-pink)" }}>
          <div className="stat-card-label">Average Monthly Cost</div>
          <div className="stat-card-value">{format(monthlyTotal)}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--brand-yellow)" }}>
          <div className="stat-card-label">Total Yearly Cost</div>
          <div className="stat-card-value">{format(yearlyTotal)}</div>
        </div>
      </div>

      <div className="card reveal">
        {isLoading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
            Loading subscriptions...
          </div>
        ) : SUBS.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">subscriptions</span>
            <p>No active subscriptions. Add one to track your recurring costs.</p>
          </div>
        ) : (
          <table className="clara-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Billing Cycle</th>
                <th>Next Renewal</th>
                <th style={{ textAlign: "right" }}>Cost</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {SUBS.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                      </div>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.cycle === "Monthly" ? "badge-blue" : "badge-yellow"}`}>{s.cycle}</span>
                  </td>
                  <td style={{ color: "var(--on-surface-variant)" }}>{s.nextDate}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{format(s.cost)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-icon"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span></button>
                    <button className="btn btn-ghost btn-icon" style={{ color: "var(--error)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span></button>
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
