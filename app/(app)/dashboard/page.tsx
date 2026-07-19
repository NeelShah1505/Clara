"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, trend, trendUp, color, glow,
}: {
  label: string; value: string; trend: string; trendUp: boolean; color: string; glow: string;
}) {
  return (
    <div className="stat-card reveal" style={{ background: color }}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-trend" style={{ color: trendUp ? "#065f46" : "#9d174d" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {trendUp ? "trending_up" : "trending_down"}
        </span>
        {trend}
      </div>
      <div className="stat-card-glow" style={{ width: 120, height: 120, bottom: -30, right: -30, background: glow }} />
    </div>
  );
}

// ── Budget progress row ────────────────────────────────────────────────────────
function BudgetRow({
  label, spent, limit, color,
}: {
  label: string; spent: string; limit: string; color: string;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div className="flex-between" style={{ marginBottom: "0.375rem" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--on-surface)" }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
          {spent} / {limit}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: "50%", background: color }} />
      </div>
    </div>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────────
function TxRow({
  icon, iconBg, merchant, category, date, amount, isIncome,
}: {
  icon: string; iconBg: string; merchant: string; category: string; date: string; amount: string; isIncome: boolean;
}) {
  return (
    <div
      className="hover-bg-container-low"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        transition: "background var(--duration-fast)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "var(--radius-full)",
          background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--on-surface)", marginBottom: 2 }}>{merchant}</p>
          <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{category} · {date}</p>
        </div>
      </div>
      <span style={{
        fontSize: 15, fontWeight: 700,
        color: isIncome ? "#065f46" : "var(--on-surface)",
        letterSpacing: "-0.01em",
      }}>
        {isIncome ? "+" : "-"}{amount}
      </span>
    </div>
  );
}

// ── Spending Trend Bar Chart ──────────────────────────────────────────────────
function SpendingTrendChart({ trend, format }: { trend: any[]; format: (n: number) => string }) {
  if (!trend || trend.length === 0) {
    return <p style={{ color: "var(--on-surface-variant)", fontSize: 14, textAlign: "center", padding: "2rem 0" }}>No spending data to display yet.</p>;
  }

  const maxVal = Math.max(...trend.map(m => Math.max(m.totalIncome, m.totalExpense)), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 180, padding: "0 0.5rem" }}>
      {trend.map((m: any) => {
        const incomeH = (m.totalIncome / maxVal) * 160;
        const expenseH = (m.totalExpense / maxVal) * 160;
        const monthLabel = new Date(m.month + "-01").toLocaleString("en-US", { month: "short" });
        return (
          <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 160 }}>
              <div style={{ width: 14, height: Math.max(incomeH, 4), background: "#22c55e", borderRadius: "4px 4px 0 0", transition: "height 0.5s" }} title={`Income: ${format(m.totalIncome)}`} />
              <div style={{ width: 14, height: Math.max(expenseH, 4), background: "#f43f5e", borderRadius: "4px 4px 0 0", transition: "height 0.5s" }} title={`Expense: ${format(m.totalExpense)}`} />
            </div>
            <span style={{ fontSize: 10, color: "var(--on-surface-variant)", fontWeight: 500 }}>{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data: walletsData } = useSWR("/api/wallets", fetcher);
  const { data: summaryData } = useSWR("/api/analytics/summary", fetcher);
  const { data: budgetData } = useSWR("/api/analytics/budget-vs-actual", fetcher);
  const { data: txData } = useSWR("/api/transactions?limit=5", fetcher);
  const { data: subData } = useSWR("/api/subscriptions", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  const { data: trendData } = useSWR("/api/analytics/trend?months=6", fetcher);
  
  const { format } = useCurrency();

  const wallets = walletsData?.wallets || [];
  const summary = summaryData || { totalIncome: 0, totalExpense: 0, net: 0 };
  const budgets = budgetData?.budgets || [];
  const transactions = txData?.transactions || [];
  const subscriptions = subData?.subscriptions || [];
  const categories = catData?.categories || [];
  const trend = trendData?.trend || [];

  const totalBalance = wallets.reduce((sum: number, w: any) => sum + w.balance, 0);

  const totalBudgetLimit = budgets.reduce((sum: number, b: any) => sum + b.monthlyLimit, 0);
  const totalBudgetSpend = budgets.reduce((sum: number, b: any) => sum + b.actualSpend, 0);
  const remainingBudget = totalBudgetLimit > 0 ? (totalBudgetLimit - totalBudgetSpend) : 0;
  const budgetPct = totalBudgetLimit > 0 ? Math.round((totalBudgetSpend / totalBudgetLimit) * 100) : 0;

  // Dynamic greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning ☀️" : hour < 17 ? "Good afternoon 🌤️" : "Good evening 🌙";
  const subGreeting = hour < 12
    ? "Start your day with a quick look at your finances."
    : hour < 17
    ? "Here's how your finances are looking today."
    : "Wind down with a summary of today's financial activity.";

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <h1 style={{ animation: "fadeInUp 0.4s var(--ease-out-expo) both" }}>
          {greeting}
        </h1>
        <p style={{ color: "var(--on-surface-variant)", animation: "fadeInUp 0.4s 0.08s var(--ease-out-expo) both" }}>
          {subGreeting}
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: "var(--gutter)" }}>
        <StatCard label="Current Balance"     value={format(totalBalance)}      trend="From wallets" trendUp color="var(--brand-yellow)" glow="rgba(255,255,255,0.5)" />
        <StatCard label="This Month Spending" value={format(summary.totalExpense)} trend="Expenses" trendUp={false} color="var(--brand-pink)"   glow="rgba(255,255,255,0.5)" />
        <StatCard label="Remaining Budget"    value={format(remainingBudget)}      trend={`${budgetPct}% budget used`} trendUp color="var(--brand-green)"  glow="rgba(255,255,255,0.5)" />
        <StatCard label="Monthly Income"      value={format(summary.totalIncome)}  trend="Income" trendUp color="var(--brand-blue)"   glow="rgba(255,255,255,0.5)" />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="content-grid-2-1" style={{ marginBottom: "var(--gutter)" }}>
        {/* Spending trend bar chart */}
        <div className="card reveal">
          <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
            <h2 className="text-headline-sm" style={{ color: "var(--on-surface)" }}>Spending Trend</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e" }} /> Income
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: "#f43f5e" }} /> Expense
              </div>
            </div>
          </div>
          <SpendingTrendChart trend={trend} format={format} />
        </div>

        {/* Budget progress */}
        <div className="card reveal" style={{ animationDelay: "100ms" }}>
          <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
            <h2 className="text-headline-sm">Budgets</h2>
            <Link href="/budgets" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ padding: budgets.length === 0 ? "2rem 0" : 0, textAlign: budgets.length === 0 ? "center" : "left" }}>
            {budgets.length === 0 ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>pie_chart</span>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No budgets set up yet.</p>
                <Link href="/budgets/new" className="btn btn-primary btn-sm" style={{ marginTop: "0.75rem" }}>Create Budget</Link>
              </>
            ) : (
              budgets.slice(0, 3).map((b: any) => {
                const cat = categories.find((c: any) => c.id === b.categoryId) || { name: b.categoryId, color: "var(--brand-blue)" };
                return (
                  <BudgetRow 
                    key={b.budgetId} 
                    label={cat.name} 
                    spent={format(b.actualSpend)} 
                    limit={format(b.monthlyLimit)} 
                    color={cat.color} 
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming bills + Recent transactions ────────────────────────────── */}
      <div className="content-grid-2" style={{ marginBottom: "var(--gutter)" }}>
        {/* Upcoming subscriptions */}
        <div className="card reveal">
          <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
            <h2 className="text-headline-sm">Upcoming Bills</h2>
            <Link href="/subscriptions" className="btn btn-ghost btn-sm">See all</Link>
          </div>
          <div style={{ padding: subscriptions.length === 0 ? "2rem 0" : 0, textAlign: subscriptions.length === 0 ? "center" : "left" }}>
            {subscriptions.length === 0 ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>event</span>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No upcoming bills.</p>
              </>
            ) : (
              subscriptions.slice(0, 3).map((s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{s.nextDueDate}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{format(s.amount)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card reveal" style={{ padding: 0 }}>
          <div className="flex-between" style={{ padding: "var(--card-padding)", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 className="text-headline-sm">Recent Transactions</h2>
            <Link href="/transactions" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ padding: transactions.length === 0 ? "3rem 0" : 0, textAlign: transactions.length === 0 ? "center" : "left" }}>
            {transactions.length === 0 ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>receipt_long</span>
                <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No transactions yet.</p>
              </>
            ) : (
              transactions.map((tx: any) => {
                const cat = categories.find((c: any) => c.id === tx.categoryId) || { name: tx.categoryId, icon: "receipt", color: "var(--brand-blue)" };
                return (
                  <TxRow 
                    key={tx.id}
                    icon={cat.icon}
                    iconBg={`${cat.color}22`}
                    merchant={tx.merchant || tx.description}
                    category={cat.name}
                    date={tx.date}
                    amount={format(tx.amount)}
                    isIncome={tx.type === "income"}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────────── */}
      <div className="card reveal" style={{ padding: "1.25rem var(--card-padding)" }}>
        <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>Quick Actions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {[
            { href: "/transactions/new?type=expense", icon: "add_circle",              label: "Add Expense",    color: "var(--brand-pink)" },
            { href: "/transactions/new?type=income",  icon: "trending_up",             label: "Log Income",     color: "var(--brand-green)" },
            { href: "/wallets/new",                   icon: "account_balance_wallet",   label: "New Wallet",     color: "var(--brand-blue)" },
            { href: "/budgets/new",                   icon: "savings",                 label: "Set Budget",     color: "var(--brand-yellow)" },
            { href: "/subscriptions/new",             icon: "subscriptions",            label: "Add Subscription", color: "var(--secondary-container)" },
            { href: "/goals/new",                     icon: "flag",                    label: "Add Goal",       color: "var(--brand-blue)" },
            { href: "/reports",                       icon: "summarize",               label: "Export Report",  color: "var(--surface-variant)" },
          ].map((a) => (
            <Link key={a.label} href={a.href}
              className="hover-transform-up"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 1rem", borderRadius: "var(--radius-full)",
                background: a.color, fontSize: 13, fontWeight: 600,
                color: "var(--on-surface)",
                transition: "transform var(--duration-fast) var(--ease-out-expo)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
