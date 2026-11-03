"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import { DataTable, Modal, Select, Textarea, Input, Badge, Button, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface MediationRequest {
  id: string | number;
  requester_id: string | number;
  target_user_id: string | number;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
  admin_notes?: string | null;
  status?: "pending" | "scheduled" | "completed" | "cancelled" | string;
  created_at?: string;
  requester_email?: string;
  requester_name?: string;
  target_email?: string;
  target_name?: string;
}

interface MediationListResponse {
  success: boolean;
  mediationRequests?: MediationRequest[];
  data?: { mediationRequests?: MediationRequest[] };
  error?: string;
  message?: string;
}

interface MediationActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

function statusVariant(status?: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "scheduled":
      return "info" as const;
    case "pending":
      return "warning" as const;
    case "cancelled":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

function MediationPageInner() {
  const [requests, setRequests] = useState<MediationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MediationRequest | null>(null);
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await adminApi.mediation()) as MediationListResponse;
      if (response.success) {
        const list = response.mediationRequests ?? response.data?.mediationRequests ?? [];
        setRequests(list);
      } else {
        setError(response.error || "Failed to load mediation requests");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openModal = (request: MediationRequest) => {
    setSelectedRequest(request);
    setStatus(request.status || "pending");
    setAdminNotes(request.admin_notes || "");
    setScheduledDate(request.preferred_date || "");
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setStatus("");
    setAdminNotes("");
    setScheduledDate("");
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const mediationId = selectedRequest.id;
      const payload = {
        requestId: mediationId,
        mediationId,
        status,
        adminNotes,
        scheduledDate,
      };
      const response = (await adminApi.mediationAction(payload)) as MediationActionResponse;
      if (response.success) {
        setRequests((prev) =>
          prev.map((r) =>
            String(r.id) === String(selectedRequest.id)
              ? {
                  ...r,
                  status,
                  admin_notes: adminNotes,
                  preferred_date: scheduledDate || r.preferred_date,
                }
              : r
          )
        );
        closeModal();
      } else {
        setError(response.error || "Failed to update mediation request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<MediationRequest>[] = [
    {
      key: "requester",
      header: "Requester",
      render: (row) => (
        <div className="text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{row.requester_email || row.requester_id}</p>
          <p className="text-xs text-slate-400">{row.requester_name || "-"}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (row) => (
        <div className="text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{row.target_email || row.target_user_id}</p>
          <p className="text-xs text-slate-400">{row.target_name || "-"}</p>
        </div>
      ),
    },
    {
      key: "preferred",
      header: "Preferred Date / Time",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.preferred_date ? `${row.preferred_date}${row.preferred_time ? `, ${row.preferred_time}` : ""}` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)} size="sm" showDot>
          {row.status || "pending"}
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
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Family Mediation Requests</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Schedule and manage family matchmaking meetings.</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        getRowId={(row) => row.id}
        emptyTitle="No mediation requests"
        emptyDescription="There are no family mediation requests to manage."
      />

      <Modal
        isOpen={!!selectedRequest}
        onClose={closeModal}
        title={selectedRequest ? `Mediation Request #${selectedRequest.id}` : "Mediation Request"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdate} loading={actionLoading}>
              Update Request
            </Button>
          </>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Requester</p>
                <p>{selectedRequest.requester_email || selectedRequest.requester_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Target</p>
                <p>{selectedRequest.target_email || selectedRequest.target_user_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Preferred Date</p>
                <p>{selectedRequest.preferred_date || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Preferred Time</p>
                <p>{selectedRequest.preferred_time || "-"}</p>
              </div>
            </div>

            {(selectedRequest.notes || selectedRequest.admin_notes) && (
              <div className="space-y-3">
                {selectedRequest.notes && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Member Notes</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
            )}

            <Select
              label="Status"
              options={[
                { label: "Pending", value: "pending" },
                { label: "Scheduled", value: "scheduled" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />

            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />

            <Textarea
              label="Admin Notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal facilitator notes (does not replace member notes)"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminMediationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading mediation requests...</div>}>
      <MediationPageInner />
    </Suspense>
  );
}
