"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { Button, Input, Select, DataTable, Pagination, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface AuditLog {
  id: number | string;
  admin_id?: string;
  admin_email?: string;
  admin_role?: string;
  action_type?: string;
  target_type?: string;
  target_id?: string | number;
  details?: string;
  created_at?: string;
}

interface AuditResponse {
  success: boolean;
  auditLogs?: AuditLog[];
  error?: string;
  message?: string;
}

interface DateRange {
  from: string;
  to: string;
}

function AdminAuditPageInner() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adminFilter, setAdminFilter] = useState("");
  const [actionType, setActionType] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = (await adminApi.audit()) as AuditResponse;
      if (response.success) {
        setLogs(response.auditLogs || []);
      } else {
        setError(response.error || "Failed to load audit logs");
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action_type) set.add(log.action_type);
    });
    return Array.from(set)
      .sort()
      .map((action) => ({ label: action, value: action }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = adminFilter.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesAdmin =
        !term ||
        (log.admin_email && log.admin_email.toLowerCase().includes(term)) ||
        (log.admin_id && log.admin_id.toLowerCase().includes(term));

      const matchesAction =
        !actionType || (log.action_type && log.action_type.toLowerCase() === actionType.toLowerCase());

      let matchesDate = true;
      if (dateRange.from || dateRange.to) {
        if (!log.created_at) {
          matchesDate = false;
        } else {
          const timestamp = new Date(log.created_at).getTime();
          if (dateRange.from) {
            const start = new Date(dateRange.from).setHours(0, 0, 0, 0);
            if (timestamp < start) matchesDate = false;
          }
          if (dateRange.to) {
            const end = new Date(dateRange.to).setHours(23, 59, 59, 999);
            if (timestamp > end) matchesDate = false;
          }
        }
      }

      return matchesAdmin && matchesAction && matchesDate;
    });
  }, [logs, adminFilter, actionType, dateRange]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const columns: Column<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (row) => (
        <span className="text-xs">
          {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "admin",
      header: "Admin",
      render: (row) => (
        <div>
          <p className="font-semibold text-sm">{row.admin_email || row.admin_id || "Unknown"}</p>
          {row.admin_role ? <p className="text-xs text-slate-400">{row.admin_role}</p> : null}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <span className="inline-flex items-center font-semibold text-maroon-600 text-xs">
          {row.action_type || "-"}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (row) => (
        <span className="text-xs">
          {row.target_type || "-"}
          {row.target_id ? ` #${row.target_id}` : ""}
        </span>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (row) => {
        let detailText = row.details || "-";
        try {
          if (row.details) {
            const parsed = JSON.parse(row.details) as Record<string, unknown>;
            detailText = Object.entries(parsed)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(", ");
          }
        } catch {
          // keep raw details string
        }
        return (
          <span className="truncate max-w-xs block text-xs" title={detailText}>
            {detailText}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track administrator actions across the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAudit}>
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            placeholder="Filter by admin email or ID..."
            value={adminFilter}
            onChange={(e) => {
              setAdminFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            placeholder="Action Type"
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setCurrentPage(1);
            }}
            options={[{ label: "All Actions", value: "" }, ...actionOptions]}
            className="py-2.5 rounded-xl border-slate-200"
          />
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="From"
              type="date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                setCurrentPage(1);
              }}
              className="py-2.5 rounded-xl border-slate-200"
            />
            <Input
              label="To"
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                setCurrentPage(1);
              }}
              className="py-2.5 rounded-xl border-slate-200"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pageItems}
        loading={loading}
        emptyTitle="No audit logs found"
        emptyDescription="Try adjusting filters or check back later."
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminAuditPageInner />
    </Suspense>
  );
}
