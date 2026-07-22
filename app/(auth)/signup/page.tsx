"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpWithEmail, signInWithGoogle } from "@/lib/firebase/auth";

function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
    setSuccessMsg("");
    setLoading(true);
    try {
      const form = e.target as HTMLFormElement;
      const email = (form.elements.namedItem("signup-email") as HTMLInputElement).value;
      const password = (form.elements.namedItem("signup-password") as HTMLInputElement).value;
      
      const user = await signUpWithEmail(email, password);
      // Wait, we can't create a session yet because email isn't verified.
      setSuccessMsg("Account created! Please check your email to verify your address before logging in.");
      // We don't redirect yet.
    } catch (err: any) {
      setError(err.message || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSuccessMsg("");
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
    <>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.375rem", color: "var(--on-surface)" }}>
          Create Account
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Log in
          </Link>
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--error-container)", color: "var(--on-error-container)", fontSize: 13, fontWeight: 500, marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--brand-green)", color: "var(--on-surface)", fontSize: 13, fontWeight: 500, marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} id="signup-form">
        {/* Name */}
        <div className="input-group">
          <label className="input-label" htmlFor="signup-name">Full Name</label>
          <input id="signup-name" className="input" type="text" placeholder="John Doe" required autoComplete="name" />
        </div>

        {/* Email */}
        <div className="input-group">
          <label className="input-label" htmlFor="signup-email">Email address</label>
          <input id="signup-email" className="input" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>

        {/* Password */}
        <div className="input-group">
          <label className="input-label" htmlFor="signup-password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="signup-password"
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
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
          <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.375rem" }}>Must be at least 8 characters.</p>
        </div>

        {/* Submit */}
        <button
          id="signup-submit"
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading}
          style={{ width: "100%", marginTop: "0.5rem", opacity: loading ? 0.7 : 1, position: "relative" }}
        >
          {loading ? (
            <>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              Creating account…
            </>
          ) : "Create Free Account →"}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
        <div className="divider" />
        <span style={{ fontSize: 12, color: "var(--on-surface-variant)", whiteSpace: "nowrap", fontWeight: 500 }}>or sign up with</span>
        <div className="divider" />
      </div>

      {/* Google */}
      <button
        id="signup-google"
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

      <p style={{ fontSize: 12, color: "var(--on-surface-variant)", textAlign: "center", marginTop: "1.5rem", lineHeight: 1.6 }}>
        By creating an account, you agree to our <Link href="#" style={{ textDecoration: "underline" }}>Terms of Service</Link> and <Link href="#" style={{ textDecoration: "underline" }}>Privacy Policy</Link>.
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

export default function SignupPage() {
  return (
    <div style={{ animation: "fadeInUp 0.4s var(--ease-out-expo) both" }}>
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
