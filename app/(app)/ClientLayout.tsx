"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import ClaraWidget from "@/components/ClaraWidget";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",      icon: "grid_view",        section: "General" },
  { href: "/transactions",   label: "Transactions",   icon: "receipt_long",     section: "General" },
  { href: "/wallets",        label: "Wallets",         icon: "account_balance_wallet", section: "General" },
  { href: "/analytics",      label: "Analytics",      icon: "monitoring",       section: "General" },
  { href: "/categories",     label: "Categories",     icon: "label",            section: "Finance" },
  { href: "/budgets",        label: "Budgets",        icon: "savings",          section: "Finance" },
  { href: "/subscriptions",  label: "Subscriptions",  icon: "subscriptions",    section: "Finance" },
  { href: "/bills",          label: "Bills",          icon: "request_quote",    section: "Finance" },
  { href: "/recurring",      label: "Recurring",      icon: "autorenew",        section: "Finance" },
  { href: "/goals",          label: "Goals",          icon: "flag",             section: "Finance" },
  { href: "/calendar",       label: "Calendar",       icon: "calendar_month",   section: "Tools" },
  { href: "/reports",        label: "Reports",        icon: "summarize",        section: "Tools" },
  { href: "/settings",       label: "Settings",       icon: "settings",         section: "Tools" },
];

const SECTIONS = ["General", "Finance", "Tools"];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Trigger scroll-reveal for dynamically rendered content
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-scale");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Derive greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <CurrencyProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── Mobile backdrop ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 39, backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`sidebar${mobileOpen ? " open" : ""}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">Clara</div>

        {/* Nav sections */}
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((i) => i.section === section);
          return (
            <div key={section}>
              <p className="sidebar-section-label">{section}</p>
              <nav className="sidebar-nav">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link${isActive ? " active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}

        {/* Footer */}
        <div className="sidebar-footer">
          <Link href="/settings" className="sidebar-link">
            <span className="material-symbols-outlined">manage_accounts</span>
            Profile
          </Link>
        </div>
      </aside>

      {/* ── Main canvas ─────────────────────────────────────────────────────── */}
      <div className="app-canvas" style={{ flex: 1 }}>
        {/* Top bar */}
        <header className="app-topbar">
          {/* Mobile menu toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ display: "none" }}
            id="mobile-menu-btn"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Search */}
          <div className="search-input" style={{ maxWidth: 360, flex: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--on-surface-variant)", flexShrink: 0 }}>search</span>
            <input type="search" placeholder="Search transactions, merchants…" aria-label="Global search" />
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button className="btn btn-ghost btn-icon" aria-label="Notifications">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            </button>
            <Link href="/settings">
              <div className="avatar" title="Profile &amp; Settings">N</div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="app-content page-enter">
          {children}
        </main>
      </div>

      <ClaraWidget />

      {/* Mobile menu button visibility via CSS */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
      </div>
    </CurrencyProvider>
  );
}
