"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import {
  Button,
  Input,
  Select,
  DataTable,
  Pagination,
  Badge,
  Modal,
  EmptyState,
  ConfirmDialog,
  type Column,
} from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";
import { useAdminAuth } from "@/context/AdminAuthContext";
import type { Payment } from "@camatrimony/shared";

interface PaymentRow extends Payment {
  user_email?: string;
  user_full_name?: string;
  package_name?: string;
  proof_url?: string;
  payment_method?: string;
}

interface PaymentsResponse {
  success: boolean;
  payments?: PaymentRow[];
  error?: string;
  message?: string;
}

function statusVariant(st?: string): "success" | "warning" | "danger" | "neutral" | "info" | "maroon" | "gold" {
  switch (st) {
    case "captured":
    case "success":
      return "success";
    case "pending":
    case "pending_verification":
      return "warning";
    case "failed":
      return "danger";
    case "refunded":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

function formatCurrency(amount?: number) {
  return amount !== undefined ? `₹${(amount / 100).toLocaleString("en-IN")}` : "—";
}

function AdminPaymentsPageInner() {
  const { session } = useAdminAuth();
  const canRefund = session?.role === "super_admin";

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [pendingRefundAmount, setPendingRefundAmount] = useState<number | undefined>(undefined);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<PaymentRow | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;

      const data = (await adminApi.payments(params)) as PaymentsResponse;
      if (data.success) {
        setPayments(data.payments || []);
      } else {
        setError(data.error || "Failed to load payments.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error while loading payments.";
      setError(message);
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [status]);

  const totalItems = payments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageItems = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return payments.slice(startIdx, startIdx + pageSize);
  }, [payments, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleConfirmPayment = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      const data = (await adminApi.confirmPayment(confirmTarget.id, {
        activateUser: true,
      })) as { success: boolean; error?: string; message?: string };
      if (data.success) {
        showToast(data.message || "Payment confirmed and membership activated.");
        setConfirmTarget(null);
        fetchPayments();
      } else {
        showToast(data.error || "Failed to confirm payment.", "error");
      }
    } catch (err) {
      console.error("Confirm payment failed:", err);
      showToast("Network error confirming payment.", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const fullAmountInr = refundTarget?.amount !== undefined ? refundTarget.amount / 100 : undefined;

  const openRefund = (row: PaymentRow) => {
    setRefundTarget(row);
    setRefundAmount("");
    setRefundReason("");
    setRefundError(null);
    setRefundConfirmOpen(false);
    setPendingRefundAmount(undefined);
  };

  const closeRefund = () => {
    if (refundLoading) return;
    setRefundTarget(null);
    setRefundAmount("");
    setRefundReason("");
    setRefundError(null);
    setRefundConfirmOpen(false);
    setPendingRefundAmount(undefined);
  };

  /** Validate form and open confirm — API expects amount in INR (rupees), not paise. */
  const requestRefundConfirm = () => {
    if (!refundTarget || fullAmountInr === undefined) return;

    let amount: number | undefined;
    if (refundAmount.trim()) {
      const parsed = Number(refundAmount);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setRefundError("Enter a valid positive refund amount in INR (rupees).");
        return;
      }
      if (parsed > fullAmountInr) {
        setRefundError(`Refund cannot exceed ₹${fullAmountInr.toLocaleString("en-IN")}.`);
        return;
      }
      amount = parsed;
    }

    setRefundError(null);
    setPendingRefundAmount(amount);
    setRefundConfirmOpen(true);
  };

  const handleRefund = async () => {
    if (!refundTarget) return;

    setRefundLoading(true);
    setRefundError(null);
    try {
      const data = (await adminApi.refundPayment(
        refundTarget.id,
        pendingRefundAmount,
        refundReason.trim() || undefined
      )) as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (data.success) {
        setRefundConfirmOpen(false);
        setRefundTarget(null);
        setRefundAmount("");
        setRefundReason("");
        setPendingRefundAmount(undefined);
        showToast(data.message || "Refund processed successfully.");
        fetchPayments();
      } else {
        setRefundConfirmOpen(false);
        setRefundError(data.error || "Failed to process refund.");
      }
    } catch (err) {
      setRefundConfirmOpen(false);
      setRefundError("Network error. Please try again.");
      console.error("Refund failed:", err);
    } finally {
      setRefundLoading(false);
    }
  };

  const confirmRefundInr =
    pendingRefundAmount ?? fullAmountInr ?? 0;

  const columns: Column<PaymentRow>[] = [
    {
      key: "id",
      header: "Payment ID",
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    {
      key: "order",
      header: "Order ID",
      render: (row) => <span className="font-mono text-xs">{row.order_id || "—"}</span>,
    },
    {
      key: "user",
      header: "Candidate",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {row.user_full_name || row.user_email || "Unknown"}
          </p>
          <p className="text-xs text-slate-500">{row.user_email || row.user_id}</p>
          {row.package_name && (
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{row.package_name}</p>
          )}
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => (
        <span className="text-xs font-semibold uppercase text-slate-500">
          {row.payment_method || "razorpay"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => <span className="font-bold">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)} size="sm" showDot>
          {row.status || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "proof",
      header: "Proof",
      render: (row) =>
        row.proof_url ? (
          <a
            href={row.proof_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-maroon-600 hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-[10px] text-slate-400">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="text-xs">{formatDate(row.created_at)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        if (row.status === "pending_verification" || row.status === "pending") {
          return (
            <Button variant="gold" size="sm" onClick={() => setConfirmTarget(row)}>
              Confirm & activate
            </Button>
          );
        }
        if (row.status === "refunded") {
          return <Badge variant="neutral" size="sm">Refunded</Badge>;
        }
        if (row.status !== "captured" && row.status !== "success") {
          return <span className="text-[10px] text-slate-400">—</span>;
        }
        if (canRefund) {
          return (
            <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => openRefund(row)}>
              Refund
            </Button>
          );
        }
        return (
          <span className="text-[10px] text-slate-400" title="Refunds require super_admin">
            Super admin only
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Payments
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review transactions, filter by status, and process refunds.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Input
            placeholder="Search email, order or payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Pending verification", value: "pending_verification" },
              { label: "Captured (paid)", value: "captured" },
              { label: "Success (legacy)", value: "success" },
              { label: "Pending", value: "pending" },
              { label: "Failed", value: "failed" },
              { label: "Refunded", value: "refunded" },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Filter by status"
            className="py-2.5 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {error && !loading && (
        <EmptyState
          title="Failed to load payments"
          description={error}
          actionText="Try Again"
          onAction={fetchPayments}
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />
      )}

      {(!error || loading) && (
        <>
          <DataTable
            columns={columns}
            data={pageItems}
            loading={loading}
            getRowId={(row) => row.id}
            emptyTitle="No payments found"
            emptyDescription="Try adjusting your filters or check back later."
          />

          {!loading && totalItems > 0 && (
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
          )}
        </>
      )}

      <Modal
        isOpen={!!refundTarget && !refundConfirmOpen}
        onClose={closeRefund}
        title="Process Refund"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeRefund} disabled={refundLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={requestRefundConfirm}
              disabled={refundLoading}
            >
              Refund
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestRefundConfirm();
          }}
          className="space-y-4"
        >
          {refundError && (
            <p
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900"
            >
              {refundError}
            </p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Payment <strong>{refundTarget?.id}</strong> — {formatCurrency(refundTarget?.amount)}{" "}
            <span className="text-xs text-slate-400">(stored as paise; shown in INR)</span>
          </p>
          <Input
            label="Refund Amount in INR (optional)"
            type="number"
            min={0.01}
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={
              fullAmountInr !== undefined
                ? `Full: ₹${fullAmountInr.toLocaleString("en-IN")}`
                : "Leave empty for full amount"
            }
            helperText={
              fullAmountInr !== undefined
                ? `Enter rupees (not paise). Leave empty to refund the full ₹${fullAmountInr.toLocaleString("en-IN")}.`
                : "Enter rupees (not paise). Leave empty for the full amount."
            }
          />
          <Input
            label="Reason (optional)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Reason for refund"
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={refundConfirmOpen && !!refundTarget}
        onClose={() => {
          if (refundLoading) return;
          setRefundConfirmOpen(false);
        }}
        onConfirm={handleRefund}
        title="Confirm Refund?"
        message={`Refund ₹${confirmRefundInr.toLocaleString("en-IN")} for payment ${refundTarget?.id}? This cannot be undone from the admin panel.${
          refundReason.trim() ? ` Reason: “${refundReason.trim()}”.` : ""
        }`}
        confirmText="Confirm Refund"
        cancelText="Back"
        variant="danger"
        loading={refundLoading}
      />

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => {
          if (confirmLoading) return;
          setConfirmTarget(null);
        }}
        onConfirm={handleConfirmPayment}
        title="Confirm manual payment?"
        message={`Mark payment as received for ${confirmTarget?.user_full_name || confirmTarget?.user_email || "this member"}, activate their ${confirmTarget?.package_name || "plan"} subscription, and set the profile as verified/active?`}
        confirmText="Confirm & activate"
        cancelText="Cancel"
        variant="gold"
        loading={confirmLoading}
      />
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminPaymentsPageInner />
    </Suspense>
  );
}
