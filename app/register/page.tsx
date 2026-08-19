"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Mail, Lock, User, Loader2,
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Check
} from "lucide-react";

import { getInitials, capitalizeName } from "@/lib/utils";

// Password strength checker
function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–5
}

function StrengthBar({ password }: { password: string }) {
  const score = getStrength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500", "bg-emerald-400"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-xs font-500 ${score <= 1 ? "text-red-400" : score <= 2 ? "text-amber-400" : "text-emerald-400"}`}>
        {labels[score]}
      </p>
    </div>
  );
}

const inputClass = "w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (getStrength(password) < 2) {
      setError("Please choose a stronger password.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-700 text-white mb-2">Account Created!</h1>
          <p className="text-white/50 text-sm mb-2">
            Welcome to BoardSync. Your account is ready.
          </p>
          <p className="text-xs text-white/30">Redirecting you to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}>
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(79,70,229,0.08)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(124,58,237,0.06)" }} />

      {/* Back link */}
      <Link href="/login"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft size={15} /> Back to sign in
      </Link>

      <div className="w-full max-w-md animate-fade-in py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 hover:scale-105 transition-transform cursor-pointer"
            style={{ background: "var(--gradient-brand)" }}>
            <Shield className="w-7 h-7 text-white" />
          </Link>
          <h1 className="text-2xl font-700 text-white mb-1">Create your account</h1>
          <p className="text-sm text-white/40">Join BoardSync and modernize your board</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(capitalizeName(e.target.value))}
                  placeholder="Alexandra Chen"
                  className={inputClass}
                  autoCapitalize="words"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <StrengthBar password={password} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full pl-10 pr-10 py-3 rounded-lg text-sm bg-white/[0.04] border text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red-500/50"
                      : confirmPassword && confirmPassword === password
                      ? "border-emerald-500/50"
                      : "border-white/[0.1]"
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {confirmPassword && confirmPassword === password && (
                  <CheckCircle2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
                  agreed ? "bg-indigo-500 border-indigo-500" : "bg-white/[0.04] border-white/20 hover:border-white/40"
                }`}
              >
                {agreed && <Check size={12} className="text-white" />}
              </button>
              <span className="text-sm text-white/50 leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 rounded-lg text-sm font-600 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creating account...</>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/25 font-500">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <p className="text-sm text-white/40 mb-3">Already have an account?</p>
            <Link
              href="/login"
              className="w-full flex items-center justify-center py-3 rounded-lg text-sm font-600 text-indigo-400 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/50 transition-all"
            >
              Sign in instead
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          © {new Date().getFullYear()} BoardSync · Board Meeting Management System
        </p>
      </div>
    </div>
  );
}
