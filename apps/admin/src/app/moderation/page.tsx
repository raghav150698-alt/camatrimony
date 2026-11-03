"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import { DataTable, Modal, Select, Textarea, Badge, Button, ConfirmDialog, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface ModerationReport {
  id: string | number;
  reporter_id: string | number;
  reported_id: string | number;
  reason: string;
  details?: string;
  severity?: "low" | "medium" | "high" | string;
  status?: "open" | "dismissed" | "resolved" | string;
  created_at?: string;
  reporter_email?: string;
  reported_email?: string;
  reported_status?: string;
  reported_strikes?: number;
}

type ModerationAction = "strike" | "suspend" | "dismiss";

interface ModerationListResponse {
  success: boolean;
  reports?: ModerationReport[];
  data?: { reports?: ModerationReport[] };
  error?: string;
  message?: string;
}

interface ModerationActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

function severityVariant(severity?: string) {
  switch (severity) {
    case "high":
      return "danger" as const;
    case "medium":
      return "warning" as const;
    case "low":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

function statusVariant(status?: string) {
  switch (status) {
    case "resolved":
      return "success" as const;
    case "dismissed":
      return "neutral" as const;
    case "open":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function ModerationPageInner() {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [action, setAction] = useState<ModerationAction>("strike");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await adminApi.moderation()) as ModerationListResponse;
      if (response.success) {
        const list = response.reports ?? response.data?.reports ?? [];
        setReports(list);
      } else {
        setError(response.error || "Failed to load moderation reports");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openModal = (report: ModerationReport) => {
    setSelectedReport(report);
    setAction("strike");
    setReason("");
  };

  const closeModal = () => {
    setSelectedReport(null);
    setAction("strike");
    setReason("");
    setConfirmOpen(false);
  };

  const actionLabel =
    action === "strike" ? "issue a strike" : action === "suspend" ? "suspend this profile" : "dismiss this report";

  const requestAction = () => {
    if (!selectedReport) return;
    if (action === "strike" || action === "suspend") {
      setConfirmOpen(true);
      return;
    }
    void handleAction();
  };

  const handleAction = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const payload: {
        reportId: string | number;
        action: ModerationAction;
        reason: string;
        userId?: string | number;
      } = {
        reportId: selectedReport.id,
        action,
        reason,
      };
      if (action !== "dismiss") {
        payload.userId = selectedReport.reported_id;
      }
      const response = (await adminApi.moderationAction(payload)) as ModerationActionResponse;
      if (response.success) {
        setReports((prev) => prev.filter((r) => String(r.id) !== String(selectedReport.id)));
        closeModal();
      } else {
        setConfirmOpen(false);
        setError(response.error || "Failed to apply moderation action");
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<ModerationReport>[] = [
    {
      key: "reported",
      header: "Reported User",
      render: (row) => (
        <div className="text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{row.reported_email || row.reported_id}</p>
          <p className="text-xs text-slate-400">Strikes: {row.reported_strikes ?? 0}</p>
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Reporter",
      render: (row) => (
        <div className="text-sm">
          <p className="font-semibold text-slate-700 dark:text-slate-300">{row.reporter_email || row.reporter_id}</p>
        </div>
      ),
    },
    { key: "reason", header: "Reason" },
    {
      key: "severity",
      header: "Severity",
      render: (row) => (
        <Badge variant={severityVariant(row.severity)} size="sm">
          {row.severity || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)} size="sm" showDot>
          {row.status || "open"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-32 text-center",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => openModal(row)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Moderation Queue</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review user reports and enforce safety actions.</p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-400"
        >
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        getRowId={(row) => row.id}
        emptyTitle="No moderation reports"
        emptyDescription="There are no open moderation reports to review."
      />

      <Modal
        isOpen={!!selectedReport && !confirmOpen}
        onClose={closeModal}
        title={selectedReport ? `Review Report: ${selectedReport.reported_email || selectedReport.reported_id}` : "Review Report"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={requestAction} loading={actionLoading}>
              Confirm Action
            </Button>
          </>
        }
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Reporter</p>
                <p>{selectedReport.reporter_email || selectedReport.reporter_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Reported</p>
                <p>{selectedReport.reported_email || selectedReport.reported_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Severity</p>
                <p>{selectedReport.severity || "Not specified"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Submitted</p>
                <p>
                  {selectedReport.created_at
                    ? new Date(selectedReport.created_at).toLocaleString("en-IN")
                    : "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reason</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedReport.reason}</p>
            </div>

            {selectedReport.details && (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Details</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedReport.details}</p>
              </div>
            )}

            <Select
              label="Action"
              options={[
                { label: "Issue Strike", value: "strike" },
                { label: "Suspend Profile", value: "suspend" },
                { label: "Dismiss Report", value: "dismiss" },
              ]}
              value={action}
              onChange={(e) => setAction(e.target.value as ModerationAction)}
            />

            <Textarea
              label="Reason / Note"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the moderation decision..."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen && !!selectedReport}
        onClose={() => {
          if (actionLoading) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleAction}
        title={action === "suspend" ? "Suspend Profile?" : "Issue Strike?"}
        message={`You are about to ${actionLabel} for ${
          selectedReport?.reported_email || selectedReport?.reported_id || "this user"
        }.${reason.trim() ? ` Note: “${reason.trim()}”.` : ""}`}
        confirmText={action === "suspend" ? "Suspend" : "Issue Strike"}
        cancelText="Back"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading moderation queue...</div>}>
      <ModerationPageInner />
    </Suspense>
  );
}
