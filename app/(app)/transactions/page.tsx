"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";
import { resolveMaterialIcon } from "@/lib/utils/iconResolver";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Interactive Options & Inline Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<"selection" | "transaction" | "subscription">("selection");
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "expense",
    billingCycle: "monthly",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 100% Authentic API Data Integration
  const { data, error, isLoading, mutate: mutateTx } = useSWR("/api/transactions", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  const { mutate: mutateSub } = useSWR("/api/subscriptions", fetcher);
  const { mutate: mutateRec } = useSWR("/api/recurring-rules", fetcher);
  
  const TRANSACTIONS = data?.transactions || [];
  const categories = catData?.categories || [];
  const { format } = useCurrency();

  const getCat = (id: string) => categories.find((c: any) => c.id === id);
  const getCatName = (id: string) => getCat(id)?.name || "General";

  // Dynamic filter chips strictly derived from authentic user database categories
  const filterChips = useMemo(() => {
    const defaultChips = ["All", "Income", "Expense"];
    const dbCategoryNames: string[] = Array.from(new Set(categories.map((c: any) => c.name))).filter((n): n is string => typeof n === "string");
    const merged = Array.from(new Set([...defaultChips, ...dbCategoryNames])).slice(0, 8);
    return merged;
  }, [categories]);

  // Authentic filtration on user's real transactions
  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((t: any) => {
      const catName = getCatName(t.categoryId);
      const isIncome = t.type === "income";
      const isExpense = t.type === "expense";
      
      let matchFilter = true;
      if (activeFilter === "Income") matchFilter = isIncome;
      else if (activeFilter === "Expense") matchFilter = isExpense;
      else if (activeFilter !== "All") matchFilter = catName.toLowerCase() === activeFilter.toLowerCase();

      const searchString = search.toLowerCase();
      const matchSearch = (t.merchant || "").toLowerCase().includes(searchString) || 
                          catName.toLowerCase().includes(searchString) ||
                          (t.notes || "").toLowerCase().includes(searchString);
      return matchFilter && matchSearch;
    });
  }, [TRANSACTIONS, activeFilter, search, categories]);

  // Real calculation of THIS MONTH vs LAST MONTH expense trends
  const expenseStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let currentSum = 0;
    let lastSum = 0;
    let countThisMonth = 0;

    TRANSACTIONS.forEach((t: any) => {
      if (t.type === "expense") {
        const d = t.date || "";
        if (d.startsWith(currentMonthPrefix)) {
          currentSum += Number(t.amount || 0);
          countThisMonth++;
        }
        else if (d.startsWith(lastMonthPrefix)) {
          lastSum += Number(t.amount || 0);
        }
      }
    });

    let percentDiff = 0;
    let trend = "up";
    if (lastSum === 0 && currentSum > 0) {
      percentDiff = 100;
      trend = "up";
    } else if (lastSum > 0) {
      const diff = ((currentSum - lastSum) / lastSum) * 100;
      percentDiff = Math.abs(Math.round(diff));
      trend = diff >= 0 ? "up" : "down";
    }

    const dailyAvg = countThisMonth > 0 ? (currentSum / Math.max(now.getDate(), 1)) : 0;

    return {
      currentSum,
      lastSum,
      percentDiff,
      trend,
      dailyAvg,
      tag: lastSum === 0 && currentSum === 0 ? "No expense history yet" : `${trend === "up" ? "+" : "-"}${percentDiff}% vs last month`
    };
  }, [TRANSACTIONS]);

  // Authentic 90-day Spending Intensity Heatmap calculated strictly from user's live database (Expanded scale!)
  const heatmapData = useMemo(() => {
    const weeks = 15;
    const daysPerWeek = 7;
    const grid = [];
    const now = new Date();
    
    // Map transaction volume to dates (last 105 days / 15 weeks)
    const txByDate: Record<string, { count: number; amount: number }> = {};
    let total90DaySpend = 0;
    let activeDays = 0;

    TRANSACTIONS.forEach((t: any) => {
      if (t.type === "expense" && t.date) {
        const d = t.date.split("T")[0];
        if (!txByDate[d]) {
          txByDate[d] = { count: 0, amount: 0 };
          activeDays++;
        }
        txByDate[d].count += 1;
        const amt = Number(t.amount || 0);
        txByDate[d].amount += amt;
        total90DaySpend += amt;
      }
    });

    // Start date 15 weeks ago from this Saturday
    const endDayOfWeek = now.getDay();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((weeks * 7) + endDayOfWeek));
    const monthLabels: { title: string; colIndex: number }[] = [];
    let lastMonthSeen = -1;

    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + (w * 7 + d));
        const dateStr = targetDate.toISOString().split("T")[0];
        const stat = txByDate[dateStr] || { count: 0, amount: 0 };
        
        if (d === 0) {
          const m = targetDate.getMonth();
          if (m !== lastMonthSeen) {
            monthLabels.push({ 
              title: targetDate.toLocaleDateString("en-US", { month: "short" }), 
              colIndex: w 
            });
            lastMonthSeen = m;
          }
        }

        let levelClass = "bg-[#1a1a1a]/5";
        if (stat.count >= 4 || stat.amount >= 5000) levelClass = "bg-[#a17987]"; 
        else if (stat.count === 3 || stat.amount >= 2500) levelClass = "bg-[#a17987]/85"; 
        else if (stat.count === 2 || stat.amount >= 1000) levelClass = "bg-[#a17987]/60"; 
        else if (stat.count === 1 || stat.amount > 0) levelClass = "bg-[#a17987]/35"; 
        
        col.push({ 
          id: `${w}-${d}`, 
          dateStr, 
          levelClass, 
          count: stat.count, 
          amount: stat.amount,
          dayLabel: targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        });
      }
      grid.push(col);
    }
    return { grid, total90DaySpend, activeDays, monthLabels };
  }, [TRANSACTIONS]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? Your wallet balance will be adjusted accordingly.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      mutateTx();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setModalMode("selection");
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return alert("Please fill in both title and amount.");
    setSubmitting(true);

    try {
      if (modalMode === "transaction") {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(formData.amount),
            merchant: formData.name,
            type: formData.type,
            date: formData.date || new Date().toISOString().split("T")[0],
            notes: "Recorded via Transactions Dashboard",
            categoryId: categories[0]?.id || "cat_general"
          }),
        });
        await mutateTx();
      } else if (modalMode === "subscription") {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            amount: Number(formData.amount),
            currency: "USD",
            billingCycle: formData.billingCycle,
            nextDueDate: formData.date || new Date().toISOString().split("T")[0],
            categoryId: categories[0]?.id || "cat_utilities",
            walletId: "default_wallet",
            notes: "Scheduled via Transactions Dashboard"
          }),
        });
        await mutateSub();
        await mutateRec();
      }
      handleCloseModal();
      alert(`🎉 Successfully recorded ${modalMode === "transaction" ? "Transaction" : "Subscription"}!`);
    } catch (err) {
      console.error(err);
      alert("Error submitting item. Please check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const getDateGroupLabel = (dateStr: string) => {
    if (!dateStr) return "RECENT";
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (dateStr === today) return "TODAY";
    if (dateStr === yesterday) return "YESTERDAY";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
    } catch {
      return dateStr.toUpperCase();
    }
  };

  const groupedTransactions = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    const sorted = [...filtered].sort((a: any, b: any) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    sorted.forEach((tx: any) => {
      const label = getDateGroupLabel(tx.date);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(tx);
    });

    map.forEach((items, label) => groups.push({ label, items }));
    return groups;
  }, [filtered]);

  // Render modal safely via React Portal to document.body to avoid any DOM stacking/overflow traps
  const renderModal = () => {
    if (!showAddModal || !mounted) return null;

    return createPortal(
      <div style={{
        position: "fixed", inset: 0, zIndex: 999999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
      }}
      onClick={handleCloseModal} // Clicking backdrop opts out and keeps user on Transactions page
      >
        <div className="card" style={{
          width: "100%", maxWidth: 480, background: "var(--surface-container-lowest, #fff)",
          borderRadius: "1.5rem", padding: "2rem", boxShadow: "0 25px 60px -15px rgba(0,0,0,0.4)",
          border: "1px solid var(--outline-variant)", color: "var(--on-surface)", position: "relative"
        }}
        onClick={e => e.stopPropagation()}
        >
          {modalMode === "selection" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--on-surface)" }}>What would you like to record?</h3>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>Choose below, or opt out to remain on Transactions.</p>
                </div>
                <button 
                  onClick={handleCloseModal} 
                  title="Close and remain on Transactions page" 
                  className="btn btn-ghost btn-icon"
                  style={{ border: "none", cursor: "pointer", padding: "8px", background: "var(--surface-container)" }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Option 1: Add Transaction */}
                <button
                  onClick={() => setModalMode("transaction")}
                  style={{
                    display: "flex", alignItems: "center", gap: "1.25rem",
                    padding: "1.25rem", borderRadius: "1.15rem",
                    border: "1px solid var(--outline-variant)",
                    background: "var(--surface, #faf8f8)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%"
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: "15px", background: "#A2C3A4", color: "#0B4B15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>receipt_long</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--on-surface)", marginBottom: "0.2rem" }}>Add Transactions</h4>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--on-surface-variant)" }}>arrow_forward</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Record an immediate one-time expense or income entry</p>
                  </div>
                </button>

                {/* Option 2: Add Subscription */}
                <button
                  onClick={() => setModalMode("subscription")}
                  style={{
                    display: "flex", alignItems: "center", gap: "1.25rem",
                    padding: "1.25rem", borderRadius: "1.15rem",
                    border: "1px solid var(--outline-variant)",
                    background: "var(--surface, #faf8f8)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%"
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: "15px", background: "#FCE59F", color: "#715100", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>request_quote</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--on-surface)", marginBottom: "0.2rem" }}>Add Subscriptions</h4>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--on-surface-variant)" }}>arrow_forward</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Schedule recurring utility bills, auto-pay items, or rent</p>
                  </div>
                </button>
              </div>

              <div style={{ marginTop: "1.75rem", textAlign: "center", borderTop: "1px solid var(--outline-variant)", paddingTop: "1rem" }}>
                <button 
                  onClick={handleCloseModal}
                  style={{ background: "none", border: "none", color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 700, cursor: "pointer", padding: "0.5rem 1rem", textDecoration: "underline" }}
                >
                  Opt out & remain on Transactions page
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleInlineSubmit}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button 
                    type="button" 
                    onClick={() => setModalMode("selection")}
                    className="btn btn-ghost btn-icon"
                    title="Back to options"
                    style={{ border: "none", cursor: "pointer", padding: "6px", background: "var(--surface-container)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                  </button>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--on-surface)" }}>
                    {modalMode === "transaction" ? "New Transaction" : "New Subscription / Bill"}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="btn btn-ghost btn-icon"
                  style={{ border: "none", cursor: "pointer", padding: "6px", background: "var(--surface-container)" }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
                    {modalMode === "transaction" ? "MERCHANT / TITLE" : "BILL / SUBSCRIPTION NAME"}
                  </label>
                  <input 
                    type="text" 
                    placeholder={modalMode === "transaction" ? "e.g., Apple Store, Grocery, Paycheck" : "e.g., Netflix, Electricity, Rent"}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
                      AMOUNT ({format(0).replace(/\d|\./g, "").trim() || "₹"})
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      required
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontWeight: 700 }}
                    />
                  </div>

                  {modalMode === "transaction" ? (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
                        TYPE
                      </label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontWeight: 600 }}
                      >
                        <option value="expense">Expense (-)</option>
                        <option value="income">Income (+)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
                        FREQUENCY
                      </label>
                      <select 
                        value={formData.billingCycle}
                        onChange={e => setFormData({ ...formData, billingCycle: e.target.value })}
                        style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontWeight: 600 }}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", display: "block", marginBottom: 6 }}>
                    DATE
                  </label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", fontWeight: 600, border: "1px solid var(--outline-variant)", cursor: "pointer" }}
                  >
                    Cancel & Stay
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", fontWeight: 700, background: "var(--primary, #000)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {submitting ? "Saving..." : `Save ${modalMode === "transaction" ? "Transaction" : "Subscription"}`}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingBottom: "4rem", position: "relative" }}>
      
      {/* ── Top Header Bar with functional Record / Add button ────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="text-headline-md font-headline-md" style={{ color: "var(--on-surface)", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.02em" }}>
            Transactions & Activity
          </h1>
          <p style={{ color: "var(--on-surface-variant)", fontSize: "15px", marginTop: "0.25rem" }}>
            Track your cashflow and spend intensity across custom categories
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-primary"
          style={{ padding: "0.75rem 1.5rem", borderRadius: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", cursor: "pointer", background: "var(--primary, #000)", color: "white", border: "none" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_card</span>
          Record New Entry
        </button>
      </div>

      {/* ── Prominent Full-Width 90-Day Spending Intensity Heatmap ────────── */}
      <div className="card reveal" style={{ padding: "2rem", borderRadius: "1.75rem", background: "var(--surface-container-lowest, #ffffff)", border: "1px solid var(--outline-variant, #c4c7c7)", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#a17987" }}>local_fire_department</span>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--on-surface)" }}>90-Day Spending Intensity Heatmap</h2>
            </div>
            <p style={{ fontSize: "14px", color: "var(--on-surface-variant)", marginTop: "0.35rem" }}>
              Visualizing daily transaction frequency & volume across the last 15 weeks. Hover over any day for precise details.
            </p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--on-surface-variant)", fontSize: "12px", fontWeight: 700, background: "var(--surface-container-low, #f6f3f2)", padding: "0.5rem 1rem", borderRadius: "999px" }}>
            <span>LESS</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(26, 26, 26, 0.06)" }} />
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(161, 121, 135, 0.35)" }} />
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(161, 121, 135, 0.6)" }} />
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(161, 121, 135, 0.85)" }} />
              <div style={{ width: 18, height: 18, borderRadius: 4, background: "#a17987" }} />
            </div>
            <span>MORE INTENSE</span>
          </div>
        </div>

        {/* Larger Immersive Heatmap Grid */}
        <div style={{ overflowX: "auto", paddingBottom: "0.5rem", display: "flex", justifyContent: "flex-start", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Day of Week Row Labels along with grid columns */}
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "space-around", paddingRight: "8px", fontSize: "11px", fontWeight: 800, color: "var(--on-surface-variant)", opacity: 0.6, userSelect: "none", paddingTop: "2px" }}>
                <span>MON</span>
                <span>WED</span>
                <span>FRI</span>
                <span>SUN</span>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {heatmapData.grid.map((col, cIdx) => (
                  <div key={cIdx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {col.map((cell, dIdx) => (
                      <div 
                        key={cell.id} 
                        onClick={() => {
                          setFormData(f => ({ ...f, date: cell.dateStr }));
                          setShowAddModal(true);
                        }}
                        title={`${cell.dayLabel}: ${cell.count} transaction(s), totaling ${format(cell.amount)}`}
                        style={{ 
                          width: 22, height: 22, borderRadius: 5, 
                          backgroundColor: cell.levelClass.includes("#a17987") && cell.levelClass.includes("/35") ? "rgba(161, 121, 135, 0.35)" :
                                           cell.levelClass.includes("#a17987") && cell.levelClass.includes("/60") ? "rgba(161, 121, 135, 0.6)" :
                                           cell.levelClass.includes("#a17987") && cell.levelClass.includes("/85") ? "rgba(161, 121, 135, 0.85)" :
                                           cell.levelClass.includes("#a17987") ? "#a17987" : "rgba(26, 26, 26, 0.06)",
                          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                          cursor: "pointer",
                          border: "1px solid rgba(0,0,0,0.03)"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "scale(1.35)";
                          e.currentTarget.style.boxShadow = "0 4px 10px rgba(161, 121, 135, 0.3)";
                          e.currentTarget.style.zIndex = "10";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.zIndex = "1";
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Footer KPI Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--outline-variant)", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total 90-Day Spend</span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--on-surface)", marginTop: "2px" }}>{format(heatmapData.total90DaySpend)}</div>
          </div>
          <div style={{ width: "1px", background: "var(--outline-variant)" }} />
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Transaction Days</span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#a17987", marginTop: "2px" }}>{heatmapData.activeDays} days</div>
          </div>
          <div style={{ width: "1px", background: "var(--outline-variant)" }} />
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily Spend Average</span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--on-surface)", marginTop: "2px" }}>{format(expenseStats.dailyAvg)} / day</div>
          </div>
        </div>
      </div>

      {/* ── 2 Pastel KPI Summary Cards Row ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Current Month Expenses */}
        <div className="card reveal" data-delay="100" style={{ 
          background: "#F4C5D5", color: "#2e131e", padding: "1.75rem", borderRadius: "1.5rem", 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          position: "relative", overflow: "hidden", border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" 
        }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expenses This Month</h3>
            <p style={{ fontSize: "38px", fontWeight: 800, letterSpacing: "-0.02em", color: "#2e131e", marginTop: "0.5rem" }}>
              {format(expenseStats.currentSum)}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "0.75rem", background: "rgba(255,255,255,0.4)", padding: "0.4rem 0.9rem", borderRadius: "999px", backdropFilter: "blur(4px)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: expenseStats.trend === "up" ? "#93000a" : "#065f46" }}>
                {expenseStats.trend === "up" ? "trending_up" : "trending_down"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: expenseStats.trend === "up" ? "#93000a" : "#065f46" }}>
                {expenseStats.tag}
              </span>
            </div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#2e131e" }}>payments</span>
          </div>
        </div>

        {/* Previous Month Comparison Card */}
        <div className="card reveal" data-delay="200" style={{ 
          background: "#A2C3A4", color: "#0B4B15", padding: "1.75rem", borderRadius: "1.5rem", 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          position: "relative", overflow: "hidden", border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" 
        }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Month Total</h3>
            <p style={{ fontSize: "38px", fontWeight: 800, letterSpacing: "-0.02em", color: "#0B4B15", marginTop: "0.5rem" }}>
              {format(expenseStats.lastSum)}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "0.75rem", background: "rgba(255,255,255,0.4)", padding: "0.4rem 0.9rem", borderRadius: "999px", backdropFilter: "blur(4px)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#0B4B15" }}>event_repeat</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0B4B15" }}>
                Based on user recorded logs
              </span>
            </div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#0B4B15" }}>history</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Authentic Transaction List & Functioning Filters ── */}
      <div className="card reveal" style={{ padding: "1.75rem", borderRadius: "1.5rem", background: "var(--surface-container-lowest, #fff)", border: "1px solid var(--outline-variant, #c4c7c7)", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
        
        {/* Filters & Header */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--on-surface)" }}>Recent Activity</h2>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Displaying {filtered.length} authentic entries ({activeFilter.toUpperCase()} filter active)</p>
          </div>
          
          {/* Functional Filter Chips ("All" reset working) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  title={`Filter transactions by ${chip}`}
                  style={{
                    padding: "0.5rem 1.35rem",
                    borderRadius: "999px",
                    border: isActive ? "none" : "1px solid var(--outline-variant)",
                    background: isActive ? "var(--primary, #000)" : "var(--surface-container-high, #eae7e7)",
                    color: isActive ? "#fff" : "var(--on-surface, #1b1c1c)",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                  }}
                >
                  {chip}
                </button>
              );
            })}
            <button 
              title="Toggle extended category filter options" 
              onClick={() => setShowFilterOptions(p => !p)}
              style={{ 
                padding: "0.5rem 1rem", borderRadius: "999px", 
                background: showFilterOptions ? "var(--primary, #000)" : "transparent", 
                color: showFilterOptions ? "#fff" : "var(--on-surface-variant)", 
                border: showFilterOptions ? "none" : "1px solid var(--outline-variant)", 
                cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, fontSize: "13px" 
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
              <span>All Categories</span>
            </button>
          </div>
        </div>

        {/* Extended Filter Bar when Tune/All Categories icon is clicked */}
        {showFilterOptions && (
          <div style={{ padding: "1.25rem", background: "var(--surface-variant, #e4e2e1)", borderRadius: "1.25rem", marginBottom: "1.75rem", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Category to Filter:</p>
              <button 
                onClick={() => setActiveFilter("All")}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Reset to All ({TRANSACTIONS.length})
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                onClick={() => setActiveFilter("All")}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "999px", border: "none",
                  background: activeFilter === "All" ? "var(--primary, #000)" : "var(--surface-container-lowest, #fff)",
                  color: activeFilter === "All" ? "white" : "var(--on-surface)",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                }}
              >
                All Categories
              </button>
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setActiveFilter(c.name)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    border: "none",
                    background: activeFilter === c.name ? "var(--primary, #000)" : "var(--surface-container-lowest, #fff)",
                    color: activeFilter === c.name ? "white" : "var(--on-surface)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    display: "flex", alignItems: "center", gap: "6px"
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: activeFilter === c.name ? "#fff" : c.color || "var(--primary)" }}>{c.icon || "category"}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Functional Search Field with Clear Icon Button */}
        <div style={{ marginBottom: "1.75rem", maxWidth: 400, position: "relative" }}>
          <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "var(--on-surface-variant)" }}>search</span>
          <input 
            type="search" 
            placeholder="Search merchants, notes, categories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "0.65rem 2.5rem 0.65rem 2.75rem", borderRadius: "999px", border: "1px solid var(--outline-variant)", background: "var(--surface-container-low)", fontSize: "14px", fontWeight: 500 }}
          />
          {search && (
            <button 
              onClick={() => setSearch("")} 
              title="Clear search"
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--on-surface-variant)", cursor: "pointer", display: "flex" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
            </button>
          )}
        </div>

        {/* Authentic Transaction Group List */}
        {isLoading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading your authentic account transactions...
          </div>
        ) : groupedTransactions.length === 0 ? (
          <div className="empty-state" style={{ padding: "4rem", textAlign: "center", color: "var(--on-surface-variant)", border: "1px dashed var(--outline-variant)", borderRadius: "1.5rem", background: "var(--surface, #faf8f8)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.3 }}>receipt</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--on-surface)", marginTop: "1rem" }}>No Transactions Found</h3>
            <p style={{ marginTop: "0.35rem", fontSize: 14, color: "var(--on-surface-variant)", maxWidth: 420, margin: "0.35rem auto 1.75rem" }}>
              {search || activeFilter !== "All" ? `No entries found for filter "${activeFilter}" ${search ? `and query "${search}"` : ""}. Try clicking 'All' to reset your filters.` : "You have not recorded any expenses or income entries yet. Get started now!"}
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              {(search || activeFilter !== "All") && (
                <button 
                  onClick={() => { setActiveFilter("All"); setSearch(""); }} 
                  className="btn btn-secondary"
                  style={{ padding: "0.65rem 1.5rem", borderRadius: "0.85rem", fontSize: "14px", fontWeight: 600, border: "1px solid var(--outline-variant)", cursor: "pointer" }}
                >
                  Reset All Filters
                </button>
              )}
              <button 
                onClick={() => setShowAddModal(true)} 
                className="btn btn-primary" 
                style={{ padding: "0.65rem 1.75rem", borderRadius: "0.85rem", fontSize: "14px", fontWeight: 700, border: "none", cursor: "pointer", background: "var(--primary, #000)", color: "white" }}
              >
                + Record New Transaction
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {groupedTransactions.map((group, gIdx) => (
              <div key={gIdx}>
                {/* Sticky Date Header */}
                <div style={{ position: "sticky", top: 0, background: "var(--surface-container-lowest, #fff)", padding: "0.5rem 0", zIndex: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: "0.75rem" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", color: "var(--on-surface-variant)" }}>
                    {group.label}
                  </h4>
                </div>

                {/* Real items in group */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {group.items.map((tx: any, tIdx: number) => {
                    const cat = getCat(tx.categoryId);
                    const categoryTitle = getCatName(tx.categoryId);
                    const timeLabel = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (tx.date || "Recently");

                    // Standardized Material symbol resolved from custom/legacy database icons
                    const iconName = resolveMaterialIcon(cat?.icon || tx.merchant || categoryTitle, tx.type === "income" ? "income" : "expense");
                    
                    const defaultColorPalette = [
                      { bg: "#E5F0E5", fg: "#2E6B2E" },
                      { bg: "#E6F4F1", fg: "#1A73E8" },
                      { bg: "#FCE8E6", fg: "#C5221F" },
                      { bg: "#FEF7E0", fg: "#F29900" },
                      { bg: "#F4E3FF", fg: "#6B21A8" }
                    ];
                    const chosenColors = cat?.color ? { bg: `${cat.color}26`, fg: cat.color } : defaultColorPalette[(gIdx + tIdx) % defaultColorPalette.length];

                    return (
                      <div 
                        key={tx.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "1rem 1.25rem", borderRadius: "1.25rem",
                          transition: "all 0.15s", border: "1px solid var(--outline-variant)",
                          background: "var(--surface-container-lowest, #fff)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.015)"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = "var(--surface-container, #f3efee)";
                          e.currentTarget.style.borderColor = "var(--outline, #898d8d)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = "var(--surface-container-lowest, #fff)";
                          e.currentTarget.style.borderColor = "var(--outline-variant)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        {/* Left: Standardized Material Icon & Merchant */}
                        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: 50, height: 50, borderRadius: "16px",
                            background: chosenColors.bg, color: chosenColors.fg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.04)"
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>{iconName}</span>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontWeight: 800, fontSize: "16px", color: "var(--on-surface)", truncate: true } as any}>
                              {tx.merchant || "Unnamed Transaction"}
                            </p>
                            <p style={{ fontSize: "13px", color: "var(--on-surface-variant)", marginTop: "3px", fontWeight: 500 }}>
                              <span style={{ fontWeight: 700, color: "var(--on-surface)" }}>{categoryTitle}</span> {tx.notes ? `• ${tx.notes}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount & Timestamp + Action */}
                        <div style={{ display: "flex", alignItems: "center", gap: "1.75rem", textAlign: "right" }}>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: "17px", color: tx.type === "income" ? "#065f46" : "var(--on-surface)", letterSpacing: "-0.02em" }}>
                              {tx.type === "income" ? "+" : "−"}{format(tx.amount)}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--on-surface-variant)", marginTop: "3px", fontWeight: 600 }}>
                              {timeLabel}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deleting === tx.id}
                            title="Delete transaction"
                            className="btn btn-ghost btn-icon"
                            style={{ border: "none", color: "var(--error, #ba1a1a)", cursor: "pointer", padding: "8px", borderRadius: "50%", background: "transparent", transition: "all 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--error-container, #ffdad6)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                              {deleting === tx.id ? "hourglass_empty" : "delete"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Action Button (FAB) opens interactive popover ───────── */}
      <button 
        onClick={() => setShowAddModal(true)}
        style={{
          position: "fixed", bottom: "2.5rem", right: "6.5rem", zIndex: 50,
          width: "60px", height: "60px",
          background: "var(--primary, #000)", color: "#fff",
          borderRadius: "18px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          border: "1px solid rgba(255,255,255,0.2)",
          cursor: "pointer"
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        title="Record new transaction or subscription"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 30 }}>add</span>
      </button>

      {/* Render Modal via createPortal to document.body */}
      {renderModal()}

    </div>
  );
}
