"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const ADMIN_NAV = [
  { href: "/admin",          label: "Overview",      icon: "dashboard",      exact: true },
  { href: "/admin/users",    label: "Users",         icon: "people",         exact: false },
  { href: "/admin/settings", label: "Site Settings", icon: "tune",           exact: false },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-scale");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Admin sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar" aria-label="Admin navigation">
        {/* Logo */}
        <div className="sidebar-logo" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span>Clara</span>
          <span className="badge badge-red" style={{ width: "fit-content", fontSize: 9 }}>Admin</span>
        </div>

        <p className="sidebar-section-label">Management</p>
        <nav className="sidebar-nav">
          {ADMIN_NAV.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link${isActive ? " active" : ""}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="sidebar-section-label">Navigation</p>
        <nav className="sidebar-nav">
          <Link href="/dashboard" className="sidebar-link">
            <span className="material-symbols-outlined">arrow_back</span>
            Back to App
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem" }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: "var(--brand-pink)", color: "var(--on-surface)" }}>A</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Admin</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Full access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Admin canvas ──────────────────────────────────────────────────────── */}
      <div className="app-canvas" style={{ flex: 1 }}>
        <header className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="badge badge-red">Admin Panel</span>
            <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
              {ADMIN_NAV.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-ghost btn-icon" aria-label="Admin notifications">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            </button>
            <div className="avatar">A</div>
          </div>
        </header>

        <main id="admin-main-content" className="app-content page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
