"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";
import { resolveMaterialIcon } from "@/lib/utils/iconResolver";
import { useRouter } from "next/navigation";

export default function BillsPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [paidBills, setPaidBills] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "paid" | "urgent">("all");
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Modal state & Opt-out retention
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<"selection" | "subscription" | "transaction">("selection");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Quick Inline Form State
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "Utilities",
    billingCycle: "monthly",
    type: "expense"
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { format } = useCurrency();
  
  // 100% Authentic User Database API integration (Subscriptions, Recurring Rules, & Transactions)
  const { data: subData, isLoading: subLoading } = useSWR("/api/subscriptions", fetcher);
  const { data: recData } = useSWR("/api/recurring-rules", fetcher);
  const { data: txData } = useSWR("/api/transactions", fetcher);
  const { data: budgetData } = useSWR("/api/budgets", fetcher);
  const { data: settingsData } = useSWR("/api/settings", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);

  const subscriptions = subData?.subscriptions || [];
  const recurringRules = recData?.recurringRules || [];
  const transactions = txData?.transactions || [];
  const budgets = budgetData?.budgets || [];
  const categories = catData?.categories || [];
  const userName = settingsData?.settings?.userName || "there";

  // Calculate dates & calendar setup
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayDate = new Date();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(currentDate);
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Process & merge all authentic recurring items from user's Subscriptions and Recurring Rules
  const processedBills = useMemo(() => {
    const rawItems: any[] = [];

    // 1. Pull from /api/subscriptions
    subscriptions.forEach((s: any) => {
      rawItems.push({
        id: s.id || `sub-${Math.random()}`,
        name: s.name || "Unnamed Bill",
        amount: Number(s.amount || 0),
        nextDueDate: s.nextDueDate || "",
        billingCycle: s.billingCycle || "monthly",
        status: s.status || (s.active ? "pending" : "inactive"),
        autoRenew: s.autoRenew || s.active || false,
        category: s.category || "General",
        source: "subscription"
      });
    });

    // 2. Pull from /api/recurring-rules
    recurringRules.forEach((r: any) => {
      const t = r.templateTransaction || {};
      if (t.type !== "income") {
        rawItems.push({
          id: r.id || `rec-${Math.random()}`,
          name: t.merchant || t.notes || "Recurring Expense",
          amount: Number(t.amount || 0),
          nextDueDate: r.nextRunDate || "",
          billingCycle: r.frequency || "monthly",
          status: r.active ? "pending" : "inactive",
          autoRenew: r.active || false,
          category: t.categoryId || "General",
          source: "recurring-rule"
        });
      }
    });

    return rawItems.map((item, idx) => {
      const dueDayStr = item.nextDueDate ? item.nextDueDate.split("-")[2] : (item.billingCycle === "yearly" ? "01" : "15");
      const dueDay = parseInt(dueDayStr || "15", 10);
      const isDueSoon = dueDay - todayDate.getDate() <= 7 && dueDay >= todayDate.getDate() && todayDate.getMonth() === month;
      const isOverdue = dueDay < todayDate.getDate() && todayDate.getMonth() === month;

      // Cross-reference user's authentic transactions this month to see if already paid
      const hasTransactionThisMonth = transactions.some((tx: any) => {
        const txDate = tx.date || "";
        const txMerchant = (tx.merchant || "").toLowerCase();
        const itemName = (item.name || "").toLowerCase();
        return txDate.startsWith(currentMonthPrefix) && (txMerchant.includes(itemName) || itemName.includes(txMerchant));
      });

      const isPaid = Boolean(paidBills[item.id] || hasTransactionThisMonth || item.status === "paid");
      
      const palette = [
        { bg: "#FCE59F", text: "#715100" },
        { bg: "#A2C3A4", text: "#0B4B15" },
        { bg: "#95B3D7", text: "#0E3A67" },
        { bg: "#F4C5D5", text: "#6B1032" },
        { bg: "#D4B2D8", text: "#481F4C" }
      ];
      const colorScheme = palette[idx % palette.length];

      let statusText = `Due on ${monthName} ${dueDay}`;
      if (isPaid) statusText = `Paid for ${monthName}`;
      else if (isOverdue) statusText = `Overdue since ${monthName} ${dueDay}`;
      else if (isDueSoon) statusText = `Due soon (${monthName} ${dueDay})`;

      return {
        id: item.id,
        name: item.name,
        amount: item.amount,
        icon: resolveMaterialIcon(item.name || "receipt", "expense"),
        color: colorScheme.bg,
        textColor: colorScheme.text,
        due: statusText,
        dueDay: isNaN(dueDay) ? 15 : dueDay,
        urgent: (isDueSoon || isOverdue) && !isPaid,
        paid: isPaid,
        autoPay: item.autoRenew,
        category: item.category
      };
    });
  }, [subscriptions, recurringRules, transactions, currentMonthPrefix, monthName, todayDate, month, paidBills]);

  // Authentic statistical summaries computed directly from user's active database
  const totalMonthly = useMemo(() => processedBills.reduce((acc: number, b: any) => acc + b.amount, 0), [processedBills]);
  const paidAmount = useMemo(() => processedBills.filter((b: any) => b.paid).reduce((acc: number, b: any) => acc + b.amount, 0), [processedBills]);
  const pendingAmount = useMemo(() => processedBills.filter((b: any) => !b.paid).reduce((acc: number, b: any) => acc + b.amount, 0), [processedBills]);
  const dueIn7DaysBills = useMemo(() => processedBills.filter((b: any) => b.urgent && !b.paid), [processedBills]);
  const dueIn7DaysAmount = useMemo(() => dueIn7DaysBills.reduce((acc: number, b: any) => acc + b.amount, 0), [dueIn7DaysBills]);

  // Real budget percentage calculation
  const budgetStatus = useMemo(() => {
    const billBudget = budgets.find((b: any) => 
      (b.name || "").toLowerCase().includes("bill") || 
      (b.name || "").toLowerCase().includes("subscrip") ||
      (b.category || "").toLowerCase().includes("bill")
    ) || budgets[0];

    if (!billBudget || !billBudget.limit || Number(billBudget.limit) === 0) {
      if (totalMonthly === 0) return { percent: 0, label: "No bill budget defined." };
      return { percent: 0, label: "No specific budget limit allocated yet." };
    }
    const limit = Number(billBudget.limit);
    const spent = totalMonthly;
    const pct = Math.min(Math.round((spent / limit) * 100), 100);
    return { 
      percent: isNaN(pct) ? 0 : pct, 
      label: `You have allocated ${format(limit)} for this category in your budgets.` 
    };
  }, [budgets, totalMonthly, format]);

  // Filtered upcoming payments list
  const filteredBills = useMemo(() => {
    return processedBills.filter((bill: any) => {
      if (activeFilter === "pending") return !bill.paid;
      if (activeFilter === "paid") return bill.paid;
      if (activeFilter === "urgent") return bill.urgent;
      return true;
    });
  }, [processedBills, activeFilter]);

  const handlePay = async (id: string, name: string, amount: number) => {
    setPaidBills(prev => ({ ...prev, [id]: true }));
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          merchant: name,
          type: "expense",
          date: new Date().toISOString().split("T")[0],
          notes: "Paid via Bills & Calendar Dashboard",
          categoryId: "expense_bills"
        }),
      });
      mutate("/api/transactions");
      mutate("/api/subscriptions");
      alert(`🎉 Successfully recorded payment of ${format(amount)} for ${name}!`);
    } catch (e) {
      console.error("Payment registration failed:", e);
    }
  };

  const handleOpenModal = (day?: number) => {
    setSelectedDay(day || todayDate.getDate());
    setModalMode("selection");
    setFormData({ name: "", amount: "", category: "Utilities", billingCycle: "monthly", type: "expense" });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setModalMode("selection");
    setSelectedDay(null);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return alert("Please enter both name and amount.");
    setSubmitting(true);
    const targetDay = String(selectedDay || todayDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${targetDay}`;

    try {
      if (modalMode === "subscription") {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            amount: Number(formData.amount),
            currency: "USD",
            billingCycle: formData.billingCycle,
            nextDueDate: formattedDate,
            categoryId: categories[0]?.id || "cat_utilities",
            walletId: "default_wallet",
            notes: "Created via Bills Dashboard Calendar"
          }),
        });
        await mutate("/api/subscriptions");
        await mutate("/api/recurring-rules");
      } else if (modalMode === "transaction") {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(formData.amount),
            merchant: formData.name,
            type: formData.type,
            date: formattedDate,
            notes: "Created via Bills Dashboard Calendar",
            categoryId: categories[0]?.id || "cat_general"
          }),
        });
        await mutate("/api/transactions");
      }
      handleCloseModal();
      alert(`🎉 Successfully added ${modalMode === "subscription" ? "Subscription" : "Transaction"}!`);
    } catch (e) {
      console.error(e);
      alert("Failed to save entry. Please verify your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Modal Content rendered directly to document.body via createPortal to bypass any CSS container stacking
  const renderModal = () => {
    if (!showAddModal || !mounted) return null;

    return createPortal(
      <div 
        style={{
          position: "fixed", inset: 0, zIndex: 999999,
          background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }}
        onClick={handleCloseModal} // Clicking backdrop opts out and keeps user on Bills page
      >
        <div 
          className="card"
          style={{
            width: "100%", maxWidth: 480, background: "var(--surface-container-lowest, #ffffff)",
            borderRadius: "1.5rem", padding: "2rem", boxShadow: "0 25px 60px -15px rgba(0,0,0,0.4)",
            border: "1px solid var(--outline-variant)", position: "relative",
            color: "var(--on-surface)"
          }}
          onClick={e => e.stopPropagation()}
        >
          {modalMode === "selection" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--on-surface)" }}>
                    {selectedDay ? `Record on ${monthName} ${selectedDay}` : "Add New Item"}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>
                    Choose what to record, or opt out to remain on Bills.
                  </p>
                </div>
                <button 
                  onClick={handleCloseModal} 
                  title="Close and remain on Bills page" 
                  className="btn btn-ghost btn-icon"
                  style={{ border: "none", cursor: "pointer", padding: "8px", background: "var(--surface-container)" }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Option 1: Add Subscriptions */}
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
                    <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Schedule recurring bills, rent, utilities, or auto-pay items</p>
                  </div>
                </button>

                {/* Option 2: Add Transactions */}
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
              </div>

              <div style={{ marginTop: "1.75rem", textAlign: "center", borderTop: "1px solid var(--outline-variant)", paddingTop: "1rem" }}>
                <button 
                  onClick={handleCloseModal}
                  style={{ background: "none", border: "none", color: "var(--on-surface-variant)", fontSize: "14px", fontWeight: 700, cursor: "pointer", padding: "0.5rem 1rem", textDecoration: "underline" }}
                >
                  Opt out & remain on Bills page
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
                    {modalMode === "subscription" ? "New Subscription / Bill" : "New Transaction"}
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
                    {modalMode === "subscription" ? "BILL / SUBSCRIPTION NAME" : "MERCHANT / TITLE"}
                  </label>
                  <input 
                    type="text" 
                    placeholder={modalMode === "subscription" ? "e.g., Netflix, Electricity, Rent" : "e.g., Starbucks, Grocery, Paycheck"}
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

                  {modalMode === "subscription" ? (
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
                  ) : (
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
                  )}
                </div>

                <div style={{ padding: "0.75rem 1rem", background: "var(--surface-container-low, #f5f2f2)", borderRadius: "0.75rem", fontSize: "13px", color: "var(--on-surface-variant)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)" }}>calendar_today</span>
                  <span>Scheduled for <strong>{monthName} {selectedDay || todayDate.getDate()}, {year}</strong></span>
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
                    {submitting ? "Saving..." : `Save ${modalMode === "subscription" ? "Subscription" : "Transaction"}`}
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
      {/* Greeting & Action bar with top right Add Bill button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="text-headline-md font-headline-md" style={{ color: "var(--on-surface)", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Hello, {userName}
          </h1>
          <p style={{ color: "var(--on-surface-variant)", fontSize: "15px" }}>
            {processedBills.length === 0 ? (
              <span>You have no recurring bills tracked yet. Click any day on the calendar below or the Add button to get started!</span>
            ) : dueIn7DaysBills.length > 0 ? (
              <span>You have <strong style={{ color: "var(--on-surface)" }}>{dueIn7DaysBills.length} upcoming bill{dueIn7DaysBills.length !== 1 ? "s" : ""}</strong> due in the next 7 days totaling <strong>{format(dueIn7DaysAmount)}</strong>.</span>
            ) : (
              <span>All your scheduled bills are up to date! You are tracking <strong style={{ color: "var(--on-surface)" }}>{processedBills.length} items</strong>.</span>
            )}
          </p>
        </div>
        
        {/* Top Right Add Bill Icon Button */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary" 
            style={{ padding: "0.75rem 1.5rem", borderRadius: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", cursor: "pointer", border: "none", background: "var(--primary, #000)", color: "white" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
            Add Bill / Action
          </button>
        </div>
      </div>

      {/* ── 3 Pastel Summary Cards Row driven entirely by User DB ────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {/* Total Monthly */}
        <div className="card reveal" style={{ background: "#FCE59F", color: "#000000", padding: "1.75rem", borderRadius: "1.5rem", position: "relative", overflow: "hidden", border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, background: "rgba(255,255,255,0.25)", borderRadius: "50%", filter: "blur(18px)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>Total Monthly</span>
            <span className="material-symbols-outlined" style={{ background: "rgba(255,255,255,0.4)", padding: "0.5rem", borderRadius: "50%", fontSize: 22, color: "#000" }}>account_balance_wallet</span>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              {format(totalMonthly)}
            </div>
            <div style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.6, letterSpacing: "0.05em" }}>PAID</div>
                <div style={{ fontSize: "15px", fontWeight: 800 }}>{format(paidAmount)}</div>
              </div>
              <div style={{ width: "1px", background: "rgba(0,0,0,0.1)" }} />
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.6, letterSpacing: "0.05em" }}>PENDING</div>
                <div style={{ fontSize: "15px", fontWeight: 800 }}>{format(pendingAmount)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Due in 7 Days */}
        <div className="card reveal" data-delay="100" style={{ background: "#F4C5D5", color: "#000000", padding: "1.75rem", borderRadius: "1.5rem", position: "relative", overflow: "hidden", border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
          <div style={{ position: "absolute", left: -30, bottom: -30, width: 140, height: 140, background: "rgba(255,255,255,0.25)", borderRadius: "50%", filter: "blur(18px)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>Due in 7 Days</span>
            <span className="material-symbols-outlined" style={{ background: "rgba(255,255,255,0.4)", padding: "0.5rem", borderRadius: "50%", fontSize: 22, color: "#000" }}>event_upcoming</span>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
              {format(dueIn7DaysAmount)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,0,0,0.06)", padding: "0.4rem 0.75rem", borderRadius: "999px", width: "fit-content" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: dueIn7DaysBills.length > 0 ? "#93000A" : "#065f46" }}>
                {dueIn7DaysBills.length > 0 ? "warning" : "check_circle"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                {dueIn7DaysBills.length > 0 ? `${dueIn7DaysBills.length} bill${dueIn7DaysBills.length > 1 ? "s" : ""} require attention` : "No immediate dues"}
              </span>
            </div>
          </div>
        </div>

        {/* Budget Status */}
        <div className="card reveal" data-delay="200" style={{ background: "#A2C3A4", color: "#000000", padding: "1.75rem", borderRadius: "1.5rem", position: "relative", overflow: "hidden", border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
          <div style={{ position: "absolute", right: 0, bottom: 0, width: 120, height: 120, background: "rgba(255,255,255,0.2)", borderTopLeftRadius: "100%", filter: "blur(12px)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "18px", fontWeight: 700 }}>Budget Status</span>
            <span className="material-symbols-outlined" style={{ background: "rgba(255,255,255,0.4)", padding: "0.5rem", borderRadius: "50%", fontSize: 22, color: "#000" }}>pie_chart</span>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.5rem" }}>
            <div style={{ width: 84, height: 84, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                <circle cx="50" cy="50" fill="none" r="38" stroke="rgba(255,255,255,0.35)" strokeWidth="10" />
                <circle 
                  cx="50" cy="50" fill="none" r="38" 
                  stroke="#ffffff" 
                  strokeDasharray="238.76" 
                  strokeDashoffset={String(238.76 - (238.76 * budgetStatus.percent) / 100)} 
                  strokeWidth="10" strokeLinecap="round" 
                />
              </svg>
              <span style={{ position: "absolute", fontSize: "17px", fontWeight: 800 }}>{budgetStatus.percent}%</span>
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.5, opacity: 0.9 }}>
              You have spent <strong style={{ fontWeight: 800, textDecoration: "underline" }}>{budgetStatus.percent}%</strong> of your allocated bill budget.
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Canvas Split (Calendar vs Upcoming Payments Panel) ───────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.4fr) minmax(320px, 1fr)", gap: "1.5rem", alignItems: "start", marginBottom: "2rem" }}>
        
        {/* Left: Interactive Calendar View */}
        <div className="card reveal" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1.5rem", border: "1px solid var(--outline-variant)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--on-surface)" }}>
                {monthName} {year}
              </h2>
              <span style={{ fontSize: 12, color: "var(--on-surface-variant)", fontWeight: 500 }}>
                💡 Click any day below to open options (Add Subscriptions / Transactions)
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.25rem", background: "var(--surface)", padding: "4px", borderRadius: "999px", border: "1px solid var(--outline-variant)" }}>
              <button onClick={handlePrevMonth} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
              </button>
              <button onClick={handleToday} style={{ padding: "0 1rem", background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "var(--on-surface)", cursor: "pointer" }}>
                Today
              </button>
              <button onClick={handleNextMonth} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{ 
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", 
            background: "var(--outline-variant)", border: "1px solid var(--outline-variant)", 
            borderRadius: "1rem", overflow: "hidden" 
          }}>
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
              <div key={d} style={{ background: "var(--surface-container-lowest)", padding: "0.6rem", textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: "var(--on-surface-variant)" }}>
                {d}
              </div>
            ))}

            {emptyDays.map(d => (
              <div key={`empty-${d}`} style={{ background: "var(--surface-container-low, #f6f3f2)", minHeight: 110, opacity: 0.5, padding: "0.5rem" }} />
            ))}

            {days.map(d => {
              const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
              const dayBills = processedBills.filter((b: any) => b.dueDay === d);

              return (
                <div 
                  key={d}
                  onClick={() => handleOpenModal(d)}
                  title={`Click day ${d} to open add options`}
                  style={{
                    background: isToday ? "var(--primary-fixed, #e5e2e1)" : "var(--surface-container-lowest)",
                    minHeight: 110, padding: "0.5rem",
                    display: "flex", flexDirection: "column",
                    transition: "all 0.15s",
                    position: "relative",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-container-high, #eae7e7)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = isToday ? "var(--primary-fixed, #e5e2e1)" : "var(--surface-container-lowest)")}
                >
                  <span style={{ 
                    fontSize: 13, fontWeight: isToday ? 800 : 600,
                    display: "inline-flex", width: 24, height: 24, borderRadius: "50%", 
                    alignItems: "center", justifyContent: "center",
                    background: isToday ? "var(--primary)" : "transparent",
                    color: isToday ? "white" : "var(--on-surface)",
                    marginBottom: "0.35rem"
                  }}>
                    {d}
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "auto" }}>
                    {dayBills.map((b: any, bIdx: number) => (
                      <div 
                        key={bIdx}
                        onClick={e => e.stopPropagation()}
                        title={`${b.name} - ${format(b.amount)} (${b.paid ? "Paid" : "Pending"})`}
                        style={{
                          background: b.paid ? "#e2e8f0" : b.color,
                          color: b.paid ? "#475569" : b.textColor,
                          padding: "3px 6px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          textDecoration: b.paid ? "line-through" : "none"
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13, flexShrink: 0 }}>{b.icon}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming Payments Side Panel with Functioning Filters */}
        <div className="card reveal" data-delay="100" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1.5rem", border: "1px solid var(--outline-variant)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--on-surface)" }}>Upcoming Payments</h2>
              <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Showing {activeFilter.toUpperCase()} items ({filteredBills.length})</span>
            </div>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button 
                onClick={() => handleOpenModal()} 
                title="Quick Add Bill / Action"
                style={{ padding: "6px", borderRadius: "50%", background: "var(--surface-container-high)", color: "var(--primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
              </button>
              <button 
                onClick={() => setShowFilterBar(prev => !prev)} 
                title="Filter upcoming payments"
                className="btn btn-ghost btn-icon" 
                style={{ color: showFilterBar ? "var(--primary)" : "var(--on-surface-variant)", background: showFilterBar ? "var(--surface-container-high)" : "transparent", border: "none", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
          </div>

          {/* Functioning Interactive Filter Bar */}
          {showFilterBar && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", padding: "0.5rem", background: "var(--surface-variant, #e4e2e1)", borderRadius: "0.75rem" }}>
              {(["all", "pending", "paid", "urgent"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: "0.35rem 0.8rem",
                    borderRadius: "999px",
                    border: "none",
                    background: activeFilter === f ? "var(--primary)" : "transparent",
                    color: activeFilter === f ? "white" : "var(--on-surface)",
                    fontSize: "12px",
                    fontWeight: activeFilter === f ? 700 : 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: 540, overflowY: "auto", paddingRight: "0.25rem" }}>
            {subLoading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
                <div className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                Loading your bills & subscriptions...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem", textAlign: "center", color: "var(--on-surface-variant)", border: "1px dashed var(--outline-variant)", borderRadius: "1rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.4 }}>event_busy</span>
                <p style={{ marginTop: "0.5rem", fontSize: 14 }}>No bills found matching `{activeFilter}`.</p>
                <button 
                  onClick={() => handleOpenModal()} 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: "0.75rem", padding: "0.4rem 1rem", borderRadius: "0.5rem", fontSize: 12, cursor: "pointer", border: "1px solid var(--outline-variant)" }}
                >
                  + Add Your First Bill
                </button>
              </div>
            ) : (
              filteredBills.map((bill: any) => {
                return (
                  <div key={bill.id} style={{
                    padding: "1rem",
                    borderRadius: "1rem",
                    border: "1px solid var(--outline-variant)",
                    background: "var(--surface-container-lowest)",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                  }}>
                    {bill.urgent && !bill.paid && (
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "var(--error, #ba1a1a)" }} />
                    )}
                    {bill.paid && (
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#065f46" }} />
                    )}

                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: bill.color, color: bill.textColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{bill.icon}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.2rem" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--on-surface)", truncate: true } as any}>{bill.name}</h3>
                          <span style={{ fontWeight: 800, color: "var(--on-surface)", fontSize: "15px" }}>{format(bill.amount)}</span>
                        </div>

                        <div style={{ fontSize: "12px", fontWeight: bill.urgent ? 700 : 500, color: bill.paid ? "#065f46" : bill.urgent ? "var(--error, #ba1a1a)" : "var(--on-surface-variant)", marginBottom: "0.75rem" }}>
                          {bill.due}
                        </div>

                        {bill.autoPay ? (
                          <button disabled style={{ width: "100%", padding: "0.5rem", background: "transparent", border: "1px solid var(--outline-variant)", color: "var(--on-surface-variant)", borderRadius: "0.5rem", fontSize: "13px", fontWeight: 600, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>task_alt</span>
                            Auto-pay active
                          </button>
                        ) : bill.paid ? (
                          <button disabled style={{ width: "100%", padding: "0.5rem", background: "#dcfce7", color: "#065f46", border: "none", borderRadius: "0.5rem", fontSize: "13px", fontWeight: 700, cursor: "default" }}>
                            Payment Recorded
                          </button>
                        ) : (
                          <button 
                            onClick={() => handlePay(bill.id, bill.name, bill.amount)}
                            style={{ width: "100%", padding: "0.55rem", background: "var(--primary, #000)", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Render Modal via createPortal to document.body */}
      {renderModal()}
    </div>
  );
}
