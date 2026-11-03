"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Eye, EyeOff, Clock } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, login } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [retryAfter, setRetryAfter] = useState(0); // seconds remaining for rate-limit
  const [customerPortalUrl, setCustomerPortalUrl] = useState("/");

  // If already logged in as admin, redirect straight to dashboard
  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  // Compute the customer portal URL (main domain without admin. prefix)
  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("admin.")) {
      const mainHost = host.replace(/^admin\./, "");
      const port = window.location.port ? `:${window.location.port}` : "";
      setCustomerPortalUrl(`${window.location.protocol}//${mainHost}${port}`);
    }
  }, []);

  // Countdown timer for rate-limit lockout
  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [retryAfter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (retryAfter > 0) return;

    setErrMsg("");
    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setErrMsg(result.error || "Invalid credentials. Access denied.");
        // Detect rate-limiting from the error message
        if (/rate.?limit|too many|lockout|wait/i.test(result.error || "")) {
          setRetryAfter(60); // default 60s cooldown
        }
        setLoading(false);
        return;
      }
      router.replace("/");
    } catch (err) {
      setErrMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = retryAfter > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-maroon-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo + Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white shadow-lg mb-4">
              <Image
                src="/logo.png"
                alt="CA Matrimony BNCN"
                fill
                sizes="64px"
                priority
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                Secured Zone
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white text-center">
              Admin Console
            </h1>
            <p className="text-sm text-white/40 font-medium mt-1 text-center">
              CA Matrimony BNCN — Restricted Access
            </p>
          </div>

          {/* Error message */}
          {errMsg && (
            <div
              className={`flex items-start gap-2.5 p-3.5 border rounded-xl text-xs font-semibold mb-5 ${
                isLocked
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              {isLocked ? (
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>
                {errMsg}
                {isLocked && (
                  <> — Please wait {retryAfter}s before retrying.</>
                )}
              </span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || isLocked}
                className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-white/25 px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-500/60 focus:border-maroon-500/40 transition-all disabled:opacity-50"
                placeholder="Enter admin username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || isLocked}
                  className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-white/25 pl-4 pr-12 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-500/60 focus:border-maroon-500/40 transition-all disabled:opacity-50"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="w-[1.125rem] h-[1.125rem]" />
                  ) : (
                    <Eye className="w-[1.125rem] h-[1.125rem]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading || !username || !password || isLocked}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-maroon-600 to-maroon-700 hover:from-maroon-500 hover:to-maroon-600 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-maroon-900/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : isLocked ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Retry in {retryAfter}s</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
            <span className="text-[10px] text-white/25 font-medium">
              256-bit SSL encrypted • Authorized personnel only
            </span>
          </div>

          {/* Link back to customer portal */}
          <div className="mt-3 text-center">
            <a
              href={customerPortalUrl}
              className="text-[11px] text-white/25 hover:text-white/50 font-medium transition-colors"
            >
              ← Back to Customer Portal
            </a>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-[10px] text-white/20 mt-5 font-medium">
          CA Matrimony BNCN © {new Date().getFullYear()} · Admin Access Only
        </p>
      </div>
    </div>
  );
}
