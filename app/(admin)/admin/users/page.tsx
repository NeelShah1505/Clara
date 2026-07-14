import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Users" };

const USERS = [
  { uid: "u1", email: "alice@example.com",  name: "Alice Johnson",   status: "active",  role: "user",  joined: "Jul 14, 2025" },
  { uid: "u2", email: "bob@example.com",    name: "Bob Smith",       status: "active",  role: "user",  joined: "Jul 13, 2025" },
  { uid: "u3", email: "carol@example.com",  name: "Carol Davis",     status: "banned",  role: "user",  joined: "Jul 10, 2025" },
  { uid: "u4", email: "david@example.com",  name: "David Wang",      status: "active",  role: "admin", joined: "Jul 9, 2025"  },
  { uid: "u5", email: "eve@example.com",    name: "Eve Carter",      status: "active",  role: "user",  joined: "Jul 5, 2025"  },
];

export default function AdminUsersPage() {
  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>User Management</h1>
          <p>Search, manage, and moderate platform users</p>
        </div>
        <div className="search-input" style={{ minWidth: 300 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--on-surface-variant)" }}>search</span>
          <input type="search" placeholder="Search by name, email, or UID..." />
        </div>
      </div>

      <div className="card reveal" style={{ padding: 0, overflow: "hidden" }}>
        <table className="clara-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.uid}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div className="avatar">{u.name[0]}</div>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${u.status === "active" ? "badge-green" : "badge-red"}`}>{u.status}</span>
                </td>
                <td>
                  <span className={`badge ${u.role === "admin" ? "badge-yellow" : "badge-grey"}`}>{u.role === "admin" ? "Admin" : "User"}</span>
                </td>
                <td style={{ color: "var(--on-surface-variant)" }}>{u.joined}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-icon" title="View details"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span></button>
                  {u.status === "active" ? (
                    <button className="btn btn-ghost btn-icon" title="Ban user" style={{ color: "var(--error)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>block</span></button>
                  ) : (
                    <button className="btn btn-ghost btn-icon" title="Unban user" style={{ color: "var(--brand-green)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
