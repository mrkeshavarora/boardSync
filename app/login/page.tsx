"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      // 1. Send credentials to 2FA checker & login OTP trigger
      const checkRes = await fetch("/api/auth/2fa/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error || "Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // If user has 2FA enabled, switch to OTP input step
      if (checkData.requires2FA) {
        setStep("otp");
        setNotice(checkData.message || "A 6-digit verification code has been sent to your email.");
        setLoading(false);
        return;
      }

      // If 2FA is not enabled, directly sign in with NextAuth credentials
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("PendingApproval") || res.error === "PendingApproval") {
          setError("Your account is pending. Please wait for an admin to accept your request.");
        } else if (res.error.includes("InactiveAccount") || res.error === "InactiveAccount") {
          setError("Your account has been deactivated. Contact an administrator.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        otp: otp.trim(),
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("InvalidOTP")) {
          setError("Invalid 2FA verification code. Please check your email and try again.");
        } else if (res.error.includes("ExpiredOTP")) {
          setError("Verification code expired. Please click Resend Code.");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setResending(true);
    setError("");
    setNotice("");
    try {
      const checkRes = await fetch("/api/auth/2fa/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.requires2FA) {
        setNotice("A new 6-digit code has been sent to your email.");
      } else {
        setError(checkData.error || "Failed to resend verification code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(79,70,229,0.08)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "rgba(124,58,237,0.06)" }}
      />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 hover:scale-105 transition-transform cursor-pointer"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Shield className="w-7 h-7 text-white" />
          </Link>
          <h1 className="text-2xl font-700 text-white mb-1">
            {step === "otp" ? "Two-Factor Verification" : "Welcome back"}
          </h1>
          <p className="text-sm text-white/40">
            {step === "otp" ? `Enter the 6-digit code sent to ${email}` : "Sign in to your BoardSync account"}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs animate-fade-in">
              <CheckCircle2 size={15} className="flex-shrink-0 text-indigo-400" />
              {notice}
            </div>
          )}

          {step === "login" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-600 text-white/60 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-gradient w-full py-3 rounded-lg text-sm font-600 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Signing in...</>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            /* 2FA OTP Step */
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-600 text-white/60 uppercase tracking-wider block text-center">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-lg bg-black/40 border border-indigo-500/40 text-white text-center tracking-[0.5em] font-mono focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="btn-gradient w-full py-3 rounded-lg text-sm font-600 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Verifying Code...</>
                ) : (
                  "Verify & Sign In"
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setError("");
                    setNotice("");
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  ← Back to Login
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resending}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Code"}
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/25 font-500">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Sign up CTA */}
          <div className="text-center">
            <p className="text-sm text-white/40 mb-3">Don&apos;t have an account?</p>
            <Link
              href="/register"
              className="w-full flex items-center justify-center py-3 rounded-lg text-sm font-600 text-indigo-400 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/50 transition-all"
            >
              Create a new account
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
