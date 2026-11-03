"use client";

import React, { useState, useEffect, useMemo } from "react";
import { StatCard, DataTable, Badge, Button, type Column } from "@camatrimony/ui";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api-client";
import { useAdminAuth } from "@/context/AdminAuthContext";

interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pendingKYC: number;
  openTickets: number;
  activeMatches: number;
}

interface TrendPoint {
  month: string;
  count: number;
}

export default function AdminDashboardPage() {
  const { session } = useAdminAuth();
  const isSuperAdmin = session?.role === "super_admin";

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentKYC, setRecentKYC] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [genderRatio, setGenderRatio] = useState<any[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<any[]>([]);
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi.dashboard();
        if (data.success) {
          setMetrics(data.metrics || data.data?.metrics);
          setRecentKYC(data.recentKYC || data.data?.recentKYC || []);
          setRecentPayments(data.recentPayments || data.data?.recentPayments || []);
          setGenderRatio(data.charts?.genderRatio || data.data?.charts?.genderRatio || []);
          setPlanBreakdown(data.charts?.planBreakdown || data.data?.charts?.planBreakdown || []);
          setRegistrationTrend(data.charts?.registrationTrend || data.data?.charts?.registrationTrend || []);
        } else {
          setError(data.error || data.message || "Failed to load dashboard data.");
        }
      } catch (err) {
        console.error("Failed to load admin dashboard statistics:", err);
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const maxTrendCount = useMemo(
    () => (registrationTrend.length ? Math.max(...registrationTrend.map((t) => t.count), 1) : 1),
    [registrationTrend]
  );

  const kycColumns: Column<any>[] = [
    {
      key: "name",
      header: "Candidate Name",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-maroon-500 text-white flex items-center justify-center font-bold text-xs">
            {row.highest_degree?.substring(0, 2) || "CA"}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {row.email ? row.email.split("@")[0] : "Candidate"}
            </p>
            <p className="text-[10px] text-slate-400">{row.highest_degree || "CA Student"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "degree_file",
      header: "Uploaded Docs",
      render: () => (
        <div className="flex items-center gap-1.5">
          <Badge variant="neutral" size="sm">Govt ID</Badge>
          <Badge variant="neutral" size="sm">Degree</Badge>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (row: any) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at || Date.now()).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: () => (
        <Link href="/kyc">
          <Button variant="outline" size="sm" className="px-3.5 py-1 text-xs">
            Review
          </Button>
        </Link>
      ),
    },
  ];

  const paymentColumns: Column<any>[] = [
    {
      key: "user_email",
      header: "User Email",
      render: (row: any) => (
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {row.user_email || "member@example.com"}
        </span>
      ),
    },
    {
      key: "plan_name",
      header: "Plan Package",
      render: (row: any) => (
        <Badge variant={row.plan_name === "Platinum" ? "gold" : row.plan_name === "Diamond" ? "info" : "maroon"} size="sm">
          {row.plan_name || "Premium Upgrade"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount Paid",
      render: (row: any) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          ₹{(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Timestamp",
      render: (row: any) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at || Date.now()).toLocaleDateString("en-IN")}
        </span>
      ),
    },
  ];

  const totalProfiles = genderRatio.reduce((acc, curr) => acc + curr.count, 0) || 1;
  const maleCount = genderRatio.find((g) => g.gender === "Male")?.count || 0;
  const femaleCount = genderRatio.find((g) => g.gender === "Female")?.count || 0;
  const malePct = Math.round((maleCount / totalProfiles) * 100);
  const femalePct = Math.round((femaleCount / totalProfiles) * 100);

  return (
    <div className="space-y-8 animate-fade-in select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            System Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregated revenue sums, KYC queues, and operational metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kyc">
            <Button variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 hover:bg-slate-50">
              Audit Pending KYC
            </Button>
          </Link>
          {isSuperAdmin && (
            <Link href="/users?new=true">
              <Button variant="gold">Register Candidate Profile</Button>
            </Link>
          )}
        </div>
      </div>

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-5">
        <StatCard
          title="Total Registered CAs"
          value={loading ? "..." : metrics?.totalUsers || 0}
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Paid Members"
          value={loading ? "..." : metrics?.activeSubscriptions || 0}
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          title="Monthly Revenue"
          value={loading ? "..." : `₹${(metrics?.monthlyRevenue || 0).toLocaleString("en-IN")}`}
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending KYC Audits"
          value={loading ? "..." : metrics?.pendingKYC || 0}
          description="Awaiting document verification"
          loading={loading}
          className={metrics?.pendingKYC && metrics.pendingKYC > 0 ? "border-rose-200 dark:border-rose-900 bg-rose-50/10" : ""}
          icon={
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Open Support Tickets"
          value={loading ? "..." : metrics?.openTickets || 0}
          description="Customer assistance logs"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          title="Mutually Accepted Matches"
          value={loading ? "..." : metrics?.activeMatches || 0}
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Registrations Trend</h3>
              <p className="text-xs text-slate-400">Monthly new candidate enrollments</p>
            </div>
            <Badge variant="maroon" size="sm">From API</Badge>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-bold">Loading trend…</div>
          ) : registrationTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
              No registration trend data yet.
            </div>
          ) : (
            <div className="h-64 flex items-end gap-3 px-2 pt-4">
              {registrationTrend.map((point) => {
                const heightPct = Math.max(4, (point.count / maxTrendCount) * 100);
                const label = point.month?.length > 7 ? point.month.slice(5) : point.month;
                return (
                  <div key={point.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-500">{point.count}</span>
                    <div
                      className="w-full max-w-[48px] rounded-t-lg bg-maroon-500/90 dark:bg-maroon-400"
                      style={{ height: `${heightPct}%` }}
                      title={`${point.month}: ${point.count}`}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Demographics & Plan conversion</h3>

            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-500">Gender Distribution</span>
                <span className="text-slate-700 dark:text-slate-300">{malePct}% M / {femalePct}% F</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-maroon-500" style={{ width: `${malePct}%` }} title="Male" />
                <div className="h-full bg-gold-400" style={{ width: `${femalePct}%` }} title="Female" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Premium Members Breakdown</h4>
              <div className="space-y-3">
                {planBreakdown.map((plan, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? "bg-maroon-500" : idx === 1 ? "bg-gold-500" : "bg-sky-500"}`} />
                      <span className="text-slate-600 dark:text-slate-400">{plan.plan_name || "Premium Plan"}</span>
                    </div>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{plan.count} Members</span>
                  </div>
                ))}
                {planBreakdown.length === 0 && !loading && (
                  <p className="text-xs text-slate-400 italic">No premium subscriptions logged yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/40">
            <Link href="/analytics">
              <Button variant="ghost" className="w-full text-xs font-bold py-2 hover:bg-slate-50">
                View Demographics Analytics Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>KYC Review Hub Queue</span>
              {metrics?.pendingKYC && metrics.pendingKYC > 0 ? (
                <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">
                  {metrics.pendingKYC} Pending
                </span>
              ) : null}
            </h3>
            <Link href="/kyc" className="text-xs font-bold text-maroon-600 hover:underline">
              View Queue
            </Link>
          </div>
          <DataTable
            columns={kycColumns}
            data={recentKYC}
            loading={loading}
            emptyTitle="All caught up!"
            emptyDescription="There are currently no matrimonial profiles waiting for document verification."
          />
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Revenue Transactions</h3>
            <Link href="/payments" className="text-xs font-bold text-maroon-600 hover:underline">
              View Ledgers
            </Link>
          </div>
          <DataTable
            columns={paymentColumns}
            data={recentPayments}
            loading={loading}
            emptyTitle="No payments logged"
            emptyDescription="Matrimonial subscription payment transactions will display here."
          />
        </div>
      </div>
    </div>
  );
}
