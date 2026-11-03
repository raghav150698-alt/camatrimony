"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { StatCard, DataTable, Badge, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface MetricMap {
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

interface PlanBreakdownItem {
  plan_name?: string;
  count?: number;
}

interface GenderRatioItem {
  gender?: string;
  count?: number;
}

interface DashboardCharts {
  planBreakdown?: PlanBreakdownItem[];
  genderRatio?: GenderRatioItem[];
  registrationTrend?: TrendPoint[];
}

interface DashboardResponse {
  success: boolean;
  metrics?: MetricMap;
  charts?: DashboardCharts;
  error?: string;
  message?: string;
}

const defaultMetrics: MetricMap = {
  totalUsers: 0,
  activeSubscriptions: 0,
  monthlyRevenue: 0,
  pendingKYC: 0,
  openTickets: 0,
  activeMatches: 0,
};

function AdminAnalyticsPageInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<MetricMap>(defaultMetrics);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdownItem[]>([]);
  const [genderRatio, setGenderRatio] = useState<GenderRatioItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        // Use real dashboard SQL (registration trend GROUP BY month) — no fake /admin/analytics soft-fail
        const dashboardResponse = (await adminApi.dashboard()) as DashboardResponse;

        if (!mounted) return;

        if (dashboardResponse.success && dashboardResponse.metrics) {
          setMetrics(dashboardResponse.metrics);
          setTrend(dashboardResponse.charts?.registrationTrend || []);
          setPlanBreakdown(dashboardResponse.charts?.planBreakdown || []);
          setGenderRatio(dashboardResponse.charts?.genderRatio || []);
        } else {
          setError(dashboardResponse.error || "Failed to load analytics");
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        if (mounted) setError("Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const maxTrendCount = useMemo(
    () => (trend.length ? Math.max(...trend.map((t) => t.count)) : 1),
    [trend]
  );

  const trendColumns: Column<TrendPoint>[] = [
    { key: "month", header: "Month" },
    {
      key: "count",
      header: "Registrations",
      render: (row) => <span className="font-bold">{row.count.toLocaleString("en-IN")}</span>,
    },
    {
      key: "bar",
      header: "Trend",
      render: (row) => (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="bg-maroon-500 h-full rounded-full transition-all"
            style={{ width: `${maxTrendCount ? (row.count / maxTrendCount) * 100 : 0}%` }}
          />
        </div>
      ),
    },
  ];

  const formatNumber = (value?: number) =>
    typeof value === "number" ? value.toLocaleString("en-IN") : "-";

  const formatCurrency = (value?: number) =>
    typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : "-";

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Analytics Dashboard
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Platform performance metrics and registration trends.
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={formatNumber(metrics.totalUsers)} loading={loading} />
        <StatCard title="Active Subscriptions" value={formatNumber(metrics.activeSubscriptions)} loading={loading} />
        <StatCard title="Monthly Revenue" value={formatCurrency(metrics.monthlyRevenue)} loading={loading} />
        <StatCard title="Pending KYC" value={formatNumber(metrics.pendingKYC)} loading={loading} />
        <StatCard title="Open Tickets" value={formatNumber(metrics.openTickets)} loading={loading} />
        <StatCard title="Active Matches" value={formatNumber(metrics.activeMatches)} loading={loading} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Registration Trend
        </h3>
        <DataTable
          columns={trendColumns}
          data={trend}
          loading={loading}
          emptyTitle="No trend data"
          emptyDescription="Trend data will appear once analytics are available."
        />
      </div>

      {!loading && (planBreakdown.length > 0 || genderRatio.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {planBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Plans
              </h3>
              <div className="flex flex-wrap gap-2">
                {planBreakdown.map((item, idx) => (
                  <Badge key={idx} variant="maroon" size="sm">
                    {item.plan_name || "Unknown"}: {item.count ?? 0}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {genderRatio.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gender Ratio
              </h3>
              <div className="flex flex-wrap gap-2">
                {genderRatio.map((item, idx) => (
                  <Badge key={idx} variant="gold" size="sm">
                    {item.gender || "Unknown"}: {item.count ?? 0}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminAnalyticsPageInner />
    </Suspense>
  );
}
