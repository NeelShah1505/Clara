"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

function getWalletStyles(type: string) {
  switch (type?.toLowerCase()) {
    case "savings": return { icon: "savings", color: "var(--brand-green)" };
    case "credit_card": case "credit card": return { icon: "credit_card", color: "var(--brand-pink)" };
    case "debit_card": case "debit card": return { icon: "credit_card", color: "var(--brand-blue)" };
    case "cash": return { icon: "payments", color: "var(--brand-yellow)" };
    case "upi": return { icon: "phone_android", color: "#8b5cf6" };
    case "paypal": return { icon: "account_balance_wallet", color: "#0070ba" };
    case "crypto": return { icon: "currency_bitcoin", color: "#f59e0b" };
    case "bank": return { icon: "account_balance", color: "var(--brand-blue)" };
    default: return { icon: "account_balance_wallet", color: "var(--brand-blue)" };
  }
}

export default function WalletsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/wallets", fetcher);
  const { data: subData } = useSWR("/api/subscriptions", fetcher);
  const { data: rulesData } = useSWR("/api/recurring-rules", fetcher);
  const WALLETS = data?.wallets || [];
  const subscriptions = subData?.subscriptions || [];
  const rules = rulesData?.recurringRules || [];
  
  const { format } = useCurrency();

  const [addFundsWallet, setAddFundsWallet] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const totalAssets = WALLETS.filter((w: any) => w.balance > 0).reduce((s: number, w: any) => s + w.balance, 0);
  const totalNegativeWallet = Math.abs(WALLETS.filter((w: any) => w.balance < 0).reduce((s: number, w: any) => s + w.balance, 0));
  
  // Projected liabilities = sum of upcoming subscription costs + recurring payment amounts
  const projectedSubCosts = subscriptions.reduce((s: number, sub: any) => s + (sub.amount || 0), 0);
  const projectedRecurring = rules.filter((r: any) => r.active).reduce((s: number, r: any) => s + (r.templateTransaction?.amount || 0), 0);
  const totalLiabilities = totalNegativeWallet + projectedSubCosts + projectedRecurring;
  
  const netWorth = totalAssets - totalLiabilities;

  const handleAddFunds = async (walletId: string) => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount === 0) return;
    try {
      await fetch(`/api/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addFunds: amount }),
      });
      mutate();
      setAddFundsWallet(null);
      setAddFundsAmount("");
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wallet? This won't delete associated transactions.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/wallets/${id}`, { method: "DELETE" });
      mutate();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Wallets & Accounts</h1>
          <p>Manage your balances across all accounts</p>
        </div>
        <Link href="/wallets/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Account
        </Link>
      </div>

      <div className="stat-grid reveal" style={{ marginBottom: "var(--gutter)" }}>
        <div className="stat-card" style={{ background: "var(--surface-container-lowest)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="stat-card-label">Total Assets</div>
          <div className="stat-card-value" style={{ color: "#065f46" }}>{format(totalAssets)}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--surface-container-lowest)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="stat-card-label">Projected Liabilities</div>
          <div className="stat-card-value" style={{ color: "var(--error)" }}>{format(totalLiabilities)}</div>
          <div className="stat-card-trend" style={{ color: "var(--on-surface-variant)", fontSize: 11 }}>
            Subscriptions + Recurring + Debt
          </div>
        </div>
        <div className="stat-card" style={{ background: "var(--brand-yellow)" }}>
          <div className="stat-card-label">Net Worth</div>
          <div className="stat-card-value">{format(netWorth)}</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
          Loading wallets...
        </div>
      ) : error ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--error)" }}>
          Failed to load wallets.
        </div>
      ) : WALLETS.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", display: "block", marginBottom: "1rem" }}>account_balance_wallet</span>
          <p style={{ color: "var(--on-surface-variant)", marginBottom: "1rem" }}>No wallets added yet.</p>
          <Link href="/wallets/new" className="btn btn-primary">Add Your First Wallet</Link>
        </div>
      ) : (
        <div className="content-grid-3">
          {WALLETS.map((w: any, i: number) => {
            const styles = getWalletStyles(w.type);
            const isAddingFunds = addFundsWallet === w.id;
            return (
              <div key={w.id} className="card reveal" data-delay={`${(i % 3) * 100}`}>
                <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: styles.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>{styles.icon}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{w.name}</h3>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{w.type} • {w.currency}</p>
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-icon" 
                    onClick={() => handleDelete(w.id)}
                    disabled={deleting === w.id}
                    style={{ color: "var(--error)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginBottom: "0.25rem" }}>Current Balance</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: w.balance >= 0 ? "var(--on-surface)" : "var(--error)", letterSpacing: "-0.02em" }}>
                    {format(w.balance, w.currency)}
                  </p>
                </div>

                {/* Add Funds */}
                {isAddingFunds ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input 
                      type="number" className="input" placeholder="Amount" step="0.01"
                      value={addFundsAmount} onChange={(e) => setAddFundsAmount(e.target.value)}
                      style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: 13 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddFunds(w.id)}>Add</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setAddFundsWallet(null); setAddFundsAmount(""); }}>✕</button>
                  </div>
                ) : (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setAddFundsWallet(w.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                    Add / Withdraw Funds
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
