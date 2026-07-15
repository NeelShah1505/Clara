"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

function getWalletStyles(type: string) {
  switch (type.toLowerCase()) {
    case "savings": return { icon: "savings", color: "var(--brand-green)" };
    case "credit card": return { icon: "credit_card", color: "var(--brand-pink)" };
    case "cash": return { icon: "payments", color: "var(--brand-yellow)" };
    default: return { icon: "account_balance", color: "var(--brand-blue)" };
  }
}

export default function WalletsPage() {
  const { data, error, isLoading } = useSWR("/api/wallets", fetcher);
  const WALLETS = data?.wallets || [];
  
  const { format } = useCurrency();

  const totalAssets = WALLETS.filter((w: any) => w.balance > 0).reduce((s: number, w: any) => s + w.balance, 0);
  const totalLiabilities = Math.abs(WALLETS.filter((w: any) => w.balance < 0).reduce((s: number, w: any) => s + w.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

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
          <div className="stat-card-label">Total Liabilities</div>
          <div className="stat-card-value" style={{ color: "var(--error)" }}>{format(totalLiabilities)}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--brand-yellow)" }}>
          <div className="stat-card-label">Total Net Balance</div>
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
        <div className="empty-state">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <p>No wallets added yet. Start by adding a bank account or cash wallet.</p>
        </div>
      ) : (
        <div className="content-grid-3">
          {WALLETS.map((w: any, i: number) => {
            const styles = getWalletStyles(w.type);
            return (
              <div key={w.id} className="card reveal" data-delay={`${(i % 3) * 100}` as "100" | "200" | "300"}>
                <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: styles.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>{styles.icon}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{w.name}</h3>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{w.type}</p>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon" aria-label="Edit wallet">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
                  </button>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginBottom: "0.25rem" }}>Current Balance</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: w.balance >= 0 ? "var(--on-surface)" : "var(--error)", letterSpacing: "-0.02em" }}>
                    {format(w.balance, w.currency)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
