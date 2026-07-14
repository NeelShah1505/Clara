import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Overview" };

const STATS = [
  { label: "Total Users",      value: "2,847",  icon: "people",         bg: "var(--brand-blue)",   trend: "+12 today" },
  { label: "Active Sessions",  value: "184",    icon: "wifi",           bg: "var(--brand-green)",  trend: "Real-time" },
  { label: "Banned Accounts",  value: "3",      icon: "block",          bg: "var(--brand-pink)",   trend: "0 new" },
  { label: "Transactions/day", value: "9,201",  icon: "receipt_long",   bg: "var(--brand-yellow)", trend: "+5% vs avg" },
];

const RECENT_USERS = [
  { uid: "u1", email: "alice@example.com",  name: "Alice Johnson",   status: "active",  joined: "Jul 14, 2025", admin: false },
  { uid: "u2", email: "bob@example.com",    name: "Bob Smith",       status: "active",  joined: "Jul 13, 2025", admin: false },
  { uid: "u3", email: "carol@example.com",  name: "Carol Davis",     status: "banned",  joined: "Jul 10, 2025", admin: false },
  { uid: "u4", email: "david@example.com",  name: "David Wang",      status: "active",  joined: "Jul 9, 2025",  admin: true  },
];

export default function AdminPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Admin Overview</h1>
        <p>Platform health, user activity, and system control</p>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────────── */}
      <div className="stat-grid reveal" style={{ marginBottom: "var(--gutter)" }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="stat-card" data-delay={`${i * 50}` as "50" | "100" | "150" | "200" | "250" | "300"} style={{ background: s.bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ fontSize: 28 }}>{s.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--on-surface)" }}>{s.icon}</span>
              </div>
            </div>
            <div className="stat-card-trend" style={{ color: "rgba(0,0,0,0.5)" }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Recent users + quick actions ──────────────────────────────────────── */}
      <div className="content-grid-2-1" style={{ marginBottom: "var(--gutter)" }}>
        {/* Recent users */}
        <div className="card reveal" style={{ padding: 0, overflow: "hidden" }}>
          <div className="flex-between" style={{ padding: "var(--card-padding)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 className="text-headline-sm">Recent Users</h2>
            <Link href="/admin/users" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          <table className="clara-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_USERS.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                        {u.name[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</p>
                        <p style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.status === "active" ? "badge-green" : "badge-red"}`}>{u.status}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.admin ? "badge-yellow" : "badge-grey"}`}>{u.admin ? "Admin" : "User"}</span>
                  </td>
                  <td style={{ color: "var(--on-surface-variant)", fontSize: 12 }}>{u.joined}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/admin/users/${u.uid}`} className="btn btn-ghost btn-icon" aria-label="View user">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--stack-md)" }}>
          <div className="card reveal" data-delay="100">
            <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { href: "/admin/users",    icon: "person_search",  label: "Search Users",      color: "var(--brand-blue)" },
                { href: "/admin/settings", icon: "tune",           label: "Feature Flags",     color: "var(--brand-yellow)" },
                { href: "/admin/users",    icon: "block",          label: "Review Bans",       color: "var(--brand-pink)" },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="hover-bg-container-low"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem", borderRadius: "var(--radius-md)",
                    background: "var(--surface-container-low)",
                    fontSize: 14, fontWeight: 500, color: "var(--on-surface)",
                    transition: "background var(--duration-fast)",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: a.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--on-surface)" }}>{a.icon}</span>
                  </div>
                  {a.label}
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--on-surface-variant)", marginLeft: "auto" }}>chevron_right</span>
                </Link>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="card reveal" data-delay="200">
            <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>System Status</h2>
            {[
              { name: "API", status: "Operational" },
              { name: "Database", status: "Operational" },
              { name: "Auth", status: "Operational" },
              { name: "Notifications", status: "Degraded" },
            ].map((svc) => (
              <div key={svc.name} className="flex-between" style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{svc.name}</span>
                <span className={`badge ${svc.status === "Operational" ? "badge-green" : "badge-yellow"}`}>{svc.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
