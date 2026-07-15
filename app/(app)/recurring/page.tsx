"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function RecurringPage() {
  const { data: rulesData, isLoading } = useSWR("/api/recurring-rules", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  
  const { format } = useCurrency();

  const rules = rulesData?.recurringRules || [];
  const categories = catData?.categories || [];

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Recurring Transactions</h1>
          <p>Automate your regular income and expenses</p>
        </div>
        <Link href="/recurring/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Rule
        </Link>
      </div>

      <div className="card reveal">
        {isLoading ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
             <div className="spinner" style={{ margin: "0 auto 1rem" }} />
             <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Loading rules...</p>
           </div>
        ) : rules.length === 0 ? (
          <div style={{ padding: "4rem 0", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", marginBottom: "1rem" }}>autorenew</span>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: "0.5rem" }}>No automated rules yet</h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: "1.5rem" }}>
              Set up automated transactions for rent, salaries, or regular bills.
            </p>
            <Link href="/recurring/new" className="btn btn-primary">Create your first rule</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {rules.map((rule: any) => {
              const cat = categories.find((c: any) => c.id === rule.templateTransaction.categoryId) || { name: rule.templateTransaction.categoryId, icon: "receipt", color: "var(--brand-blue)" };
              return (
                <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${cat.color}22`, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined">{cat.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{rule.templateTransaction.merchant || "Recurring Transaction"}</p>
                      <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                        {rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1)} • Next run: {rule.nextRunDate}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: rule.templateTransaction.type === "income" ? "var(--brand-green)" : "var(--on-surface)" }}>
                      {rule.templateTransaction.type === "income" ? "+" : "-"}{format(rule.templateTransaction.amount, rule.templateTransaction.currency)}
                    </p>
                    <span className={`badge ${rule.active ? "badge-green" : "badge-red"}`} style={{ marginTop: "0.25rem", display: "inline-block" }}>
                      {rule.active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
