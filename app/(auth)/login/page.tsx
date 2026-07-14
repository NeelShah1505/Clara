"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";

// export const metadata: Metadata = { title: "Log in" }; // client component — use generateMetadata in a parent

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSessionSync(user: any) {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || "Failed to create session");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = e.target as HTMLFormElement;
      const email = (form.elements.namedItem("login-email") as HTMLInputElement).value;
      const password = (form.elements.namedItem("login-password") as HTMLInputElement).value;
      const user = await signInWithEmail(email, password);
      await handleSessionSync(user);
      router.push(searchParams.get("redirect") || "/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      await handleSessionSync(user);
      router.push(searchParams.get("redirect") || "/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: "fadeInUp 0.4s var(--ease-out-expo) both" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.375rem", color: "var(--on-surface)" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sign up free
          </Link>
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--error-container)", color: "var(--on-error-container)", fontSize: 13, fontWeight: 500, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} id="login-form">
        {/* Email */}
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">Email address</label>
          <input id="login-email" className="input" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>

        {/* Password */}
        <div className="input-group">
          <div className="flex-between" style={{ marginBottom: "0.375rem" }}>
            <label className="input-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--on-surface-variant)", fontWeight: 500 }}>Forgot?</Link>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ paddingRight: "2.75rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--on-surface-variant)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPassword ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading}
          style={{ width: "100%", marginTop: "0.5rem", opacity: loading ? 0.7 : 1, position: "relative" }}
        >
          {loading ? (
            <>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              Signing in…
            </>
          ) : "Sign in →"}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
        <div className="divider" />
        <span style={{ fontSize: 12, color: "var(--on-surface-variant)", whiteSpace: "nowrap", fontWeight: 500 }}>or continue with</span>
        <div className="divider" />
      </div>

      {/* Google */}
      <button
        id="login-google"
        className="btn btn-secondary"
        style={{ width: "100%", gap: "0.625rem" }}
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.48h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
