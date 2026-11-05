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
  ConfirmDialog,
  EmptyState,
  FileUpload,
  Textarea,
  type Column,
} from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";
import { validateUploadFile } from "@camatrimony/shared";
import type { Subscription, Package } from "@camatrimony/shared";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function packageValidityDays(pkg: Package | null | undefined): number {
  if (!pkg) return 0;
  return Number((pkg as any).validity_days ?? (pkg as any).validityDays ?? 0);
}

interface SubscriptionRow extends Subscription {
  plan_name?: string;
  plan_price?: number;
  contact_limit?: number;
  contact_limit_balance?: number;
  gender?: string;
  highest_degree?: string;
  occupation?: string;
  user_email?: string;
}

interface SubscriptionsResponse {
  success: boolean;
  subscriptions?: SubscriptionRow[];
  error?: string;
  message?: string;
}

function statusVariant(st?: string): "success" | "warning" | "danger" | "neutral" | "info" | "maroon" | "gold" {
  switch (st) {
    case "active":
    case "success":
      return "success";
    case "pending":
    case "expired":
      return "warning";
    case "cancelled":
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

function AdminSubscriptionsPageInner() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Assign plan modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: "",
    packageId: "",
    startDate: todayDateInputValue(),
    validityDays: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignProofUrl, setAssignProofUrl] = useState<string | null>(null);
  const [assignProofName, setAssignProofName] = useState<string | null>(null);
  const [assignProofUploading, setAssignProofUploading] = useState(false);
  const [assignProofError, setAssignProofError] = useState<string | null>(null);
  const [assignPaymentNotes, setAssignPaymentNotes] = useState("");
  const [resolvedUser, setResolvedUser] = useState<{ id: string; email?: string } | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveNote, setResolveNote] = useState<string | null>(null);

  // Extend modal
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<SubscriptionRow | null>(null);
  const [extendDays, setExtendDays] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminApi.subscriptions()) as SubscriptionsResponse;
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      } else {
        setError(data.error || "Failed to load subscriptions.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error while loading subscriptions.";
      setError(message);
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const data = (await adminApi.packages()) as {
        success: boolean;
        packages?: Package[];
        error?: string;
      };
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (assignOpen && packages.length === 0) {
      fetchPackages();
    }
  }, [assignOpen, packages.length, fetchPackages]);

  const filteredSubscriptions = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return subscriptions.filter((s) => {
      const statusMatch = !status || s.status === status;
      const searchMatch =
        !term ||
        s.user_id?.toLowerCase().includes(term) ||
        s.user_email?.toLowerCase().includes(term) ||
        s.plan_name?.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });
  }, [subscriptions, status, debouncedSearch]);

  const totalItems = filteredSubscriptions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filteredSubscriptions.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedPackage = useMemo(
    () => packages.find((p) => String(p.id) === assignForm.packageId) || null,
    [packages, assignForm.packageId]
  );

  const assignExpiryPreview = useMemo(() => {
    const days = Number(assignForm.validityDays);
    if (!assignForm.startDate || !days || days < 1) return null;
    const start = new Date(`${assignForm.startDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN");
  }, [assignForm.startDate, assignForm.validityDays]);

  const packageOptions = useMemo(() => {
    if (packagesLoading) {
      return [{ label: "Loading packages…", value: "__loading" }];
    }
    if (packages.length === 0) {
      return [{ label: "No packages available", value: "__empty" }];
    }
    return packages.map((p) => ({
      label: `${p.name} — ₹${Number(p.price).toLocaleString("en-IN")} · ${p.validity_days} days · ${p.contact_limit} contacts`,
      value: String(p.id),
    }));
  }, [packages, packagesLoading]);

  const openAssign = () => {
    setAssignForm({ userId: "", packageId: "", startDate: todayDateInputValue(), validityDays: "" });
    setAssignError(null);
    setResolvedUser(null);
    setResolveNote(null);
    setAssignOpen(true);
  };

  const resolveCandidate = async (raw: string) => {
    const value = raw.trim();
    setResolvedUser(null);
    setResolveNote(null);
    if (!value) return;

    setResolveLoading(true);
    try {
      if (value.includes("@")) {
        const data = (await adminApi.users({ search: value, limit: "5" })) as {
          success: boolean;
          users?: Array<{ id: string; email?: string }>;
          data?: { users?: Array<{ id: string; email?: string }> };
        };
        const users = data.users || data.data?.users || [];
        const exact =
          users.find((u) => u.email?.toLowerCase() === value.toLowerCase()) || users[0];
        if (exact?.id) {
          setResolvedUser({ id: exact.id, email: exact.email });
          setAssignForm((prev) => ({ ...prev, userId: exact.id }));
          setResolveNote(null);
        } else {
          setResolveNote("No user found for that email. Paste the Firebase UID from Users instead.");
        }
      } else {
        const data = (await adminApi.user(value)) as {
          success: boolean;
          profile?: { user_id?: string; user_email?: string };
          data?: { profile?: { user_id?: string; user_email?: string } };
          error?: string;
        };
        if (data.success) {
          const profile = data.profile || data.data?.profile;
          setResolvedUser({
            id: profile?.user_id || value,
            email: profile?.user_email,
          });
          setResolveNote(null);
        } else {
          setResolveNote("UID not found. Confirm it on the Users page, or try the candidate email.");
        }
      }
    } catch (err) {
      console.error("Candidate lookup failed:", err);
      setResolveNote("Lookup failed. You can still assign using a Firebase UID.");
    } finally {
      setResolveLoading(false);
    }
  };

  const handleAssignProofSelect = async (files: File[]) => {
    const file = files[0];
    const userId = (resolvedUser?.id || assignForm.userId).trim();
    if (!file || !userId) {
      setAssignProofError(userId ? null : "Enter user ID or email first.");
      return;
    }

    const validationError = validateUploadFile(file, "payment_proof");
    if (validationError) {
      setAssignProofError(validationError);
      setAssignProofUrl(null);
      setAssignProofName(null);
      return;
    }

    setAssignProofUploading(true);
    setAssignProofError(null);
    try {
      const data = await adminApi.uploadPaymentProof(userId, file);
      if (data.success && data.url) {
        setAssignProofUrl(data.url);
        setAssignProofName(data.fileName || file.name);
      } else {
        setAssignProofUrl(null);
        setAssignProofName(null);
        setAssignProofError(data.error || "Upload failed");
      }
    } catch {
      setAssignProofUrl(null);
      setAssignProofName(null);
      setAssignProofError("Upload failed. Please try again.");
    } finally {
      setAssignProofUploading(false);
    }
  };

  const handleAssign = async () => {
    setAssignError(null);
    const userId = (resolvedUser?.id || assignForm.userId).trim();
    if (!userId || !assignForm.packageId || assignForm.packageId.startsWith("__")) {
      setAssignError("User ID and package are required.");
      return;
    }
    const days = assignForm.validityDays
      ? Number(assignForm.validityDays)
      : packageValidityDays(selectedPackage);
    if (!days || days < 1) {
      setAssignError("Plan period must be at least 1 day.");
      return;
    }

    if (!assignProofUrl) {
      setAssignError("Upload proof of payment before assigning the plan.");
      return;
    }

    setAssignLoading(true);
    try {
      const data = (await adminApi.assignSubscription({
        userId,
        packageId: Number(assignForm.packageId),
        validityDays: days,
        startDate: assignForm.startDate,
        proofUrl: assignProofUrl,
        adminNotes: assignPaymentNotes.trim() || undefined,
      })) as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (data.success) {
        setAssignOpen(false);
        setAssignForm({ userId: "", packageId: "", startDate: todayDateInputValue(), validityDays: "" });
        setResolvedUser(null);
        setResolveNote(null);
        setAssignProofUrl(null);
        setAssignProofName(null);
        setAssignPaymentNotes("");
        setAssignProofError(null);
        showToast(data.message || "Subscription assigned successfully.");
        fetchSubscriptions();
      } else {
        setAssignError(data.error || "Failed to assign subscription.");
      }
    } catch (err) {
      setAssignError("Network error. Please try again.");
      console.error("Assign subscription failed:", err);
    } finally {
      setAssignLoading(false);
    }
  };

  const openExtend = (row: SubscriptionRow) => {
    setExtendTarget(row);
    setExtendDays("");
    setExtendOpen(true);
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    const days = Number(extendDays);
    if (!days || days <= 0) {
      showToast("Enter a positive number of days.", "error");
      return;
    }

    setExtendLoading(true);
    try {
      const data = (await adminApi.updateSubscription({
        subscriptionId: extendTarget.id,
        action: "extend",
        extendDays: days,
      })) as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (data.success) {
        setExtendOpen(false);
        setExtendTarget(null);
        setExtendDays("");
        showToast(data.message || "Subscription extended successfully.");
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to extend subscription.", "error");
      }
    } catch (err) {
      showToast("Network error while extending subscription.", "error");
      console.error("Extend subscription failed:", err);
    } finally {
      setExtendLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const data = (await adminApi.updateSubscription({
        subscriptionId: cancelTarget.id,
        action: "cancel",
      })) as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (data.success) {
        showToast(data.message || "Subscription cancelled successfully.");
        fetchSubscriptions();
      } else {
        showToast(data.error || "Failed to cancel subscription.", "error");
      }
    } catch (err) {
      showToast("Network error while cancelling subscription.", "error");
      console.error("Cancel subscription failed:", err);
    } finally {
      setCancelLoading(false);
      setCancelTarget(null);
    }
  };

  const columns: Column<SubscriptionRow>[] = [
    {
      key: "user",
      header: "Candidate",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {row.user_email || "Unknown"}
          </p>
          <p className="text-xs text-slate-500">UID: {row.user_id}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {row.plan_name || "—"}
          </p>
          <p className="text-xs text-slate-500">
            ₹{Number(row.plan_price || 0).toLocaleString("en-IN")}
          </p>
        </div>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <p>
            <span className="text-slate-500">Start:</span> {formatDate(row.start_date)}
          </p>
          <p>
            <span className="text-slate-500">End:</span> {formatDate(row.end_date)}
          </p>
        </div>
      ),
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
      key: "actions",
      header: "Actions",
      className: "w-32",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openExtend(row)}>
            Extend
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setCancelTarget(row)}>
            Cancel
          </Button>
        </div>
      ),
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
            Subscriptions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage candidate subscriptions, assign plans, extend validity, and cancel memberships.
          </p>
        </div>
        <Button variant="gold" onClick={openAssign}>
          Assign Plan
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Input
            placeholder="Search by user ID or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2.5 rounded-xl border-slate-200"
          />
          <Select
            options={[
              { label: "Active", value: "active" },
              { label: "Cancelled", value: "cancelled" },
              { label: "Expired", value: "expired" },
              { label: "Pending", value: "pending" },
            ]}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by status"
            className="py-2.5 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {error && !loading && (
        <EmptyState
          title="Failed to load subscriptions"
          description={error}
          actionText="Try Again"
          onAction={fetchSubscriptions}
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
            emptyTitle="No subscriptions found"
            emptyDescription="Try adjusting your filters or assign a new plan."
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
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Plan"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              type="submit"
              form="assign-plan-form"
              loading={assignLoading}
              disabled={packagesLoading || packages.length === 0 || !assignProofUrl || assignProofUploading}
            >
              Assign Plan
            </Button>
          </>
        }
      >
        <form
          id="assign-plan-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAssign();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400 -mt-1">
            Manually activate a membership. Plan period defaults from Package Catalog; set start date and upload payment proof.
          </p>
          {assignError && (
            <p
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/60"
            >
              {assignError}
            </p>
          )}
          <Input
            id="assign-user-id"
            label="User ID or email"
            value={assignForm.userId}
            onChange={(e) => {
              setAssignForm({ ...assignForm, userId: e.target.value });
              setResolvedUser(null);
              setResolveNote(null);
            }}
            onBlur={(e) => resolveCandidate(e.target.value)}
            placeholder="Paste Firebase UID or email"
            helperText="Paste Firebase UID from the Users page, or enter email and blur to look up."
            required
          />
          {(resolveLoading || resolvedUser || resolveNote) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-xs space-y-0.5">
              {resolveLoading && (
                <p className="text-slate-500 dark:text-slate-400">Looking up candidate…</p>
              )}
              {!resolveLoading && resolvedUser && (
                <>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {resolvedUser.email || "Candidate found"}
                  </p>
                  <p className="font-mono text-slate-500 dark:text-slate-400 break-all">
                    UID: {resolvedUser.id}
                  </p>
                </>
              )}
              {!resolveLoading && resolveNote && (
                <p className="text-amber-700 dark:text-amber-400">{resolveNote}</p>
              )}
            </div>
          )}
          <Select
            id="assign-package"
            label="Package"
            options={packageOptions}
            value={assignForm.packageId}
            onChange={(e) => {
              const packageId = e.target.value.startsWith("__") ? "" : e.target.value;
              const pkg = packages.find((p) => String(p.id) === packageId);
              setAssignForm((prev) => ({
                ...prev,
                packageId,
                validityDays: pkg ? String(packageValidityDays(pkg)) : "",
              }));
            }}
            placeholder={packagesLoading ? "Loading packages…" : "Select a package"}
            disabled={packagesLoading || packages.length === 0}
            required
            helperText={
              packages.length === 0 && !packagesLoading
                ? "Create a package first on the Packages page."
                : undefined
            }
          />
          <Input
            id="assign-start-date"
            label="Plan start date"
            type="date"
            value={assignForm.startDate}
            onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
            required
          />
          <Input
            id="assign-validity"
            label="Plan period (days)"
            type="number"
            min={1}
            value={assignForm.validityDays}
            onChange={(e) => setAssignForm({ ...assignForm, validityDays: e.target.value })}
            placeholder={
              selectedPackage
                ? String(packageValidityDays(selectedPackage))
                : "Days from Package Catalog"
            }
            helperText={
              assignExpiryPreview
                ? `Expires on ${assignExpiryPreview} · from Package Catalog default`
                : selectedPackage
                ? `Default ${packageValidityDays(selectedPackage)} days for ${selectedPackage.name}`
                : "Select a package to prefill period"
            }
            required
          />
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Proof of payment <span className="text-rose-500">*</span>
            </span>
            <FileUpload
              label="Upload UPI screenshot, receipt, or bank transfer proof"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              maxSizeMB={5}
              onFileSelect={handleAssignProofSelect}
              error={assignProofError || undefined}
            />
            {assignProofUploading && (
              <p className="text-xs font-semibold text-slate-500">Uploading proof…</p>
            )}
            {assignProofUrl && assignProofName && !assignProofUploading && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ {assignProofName} uploaded
              </p>
            )}
          </div>
          <Textarea
            placeholder="Optional notes — UPI ref, receipt #…"
            value={assignPaymentNotes}
            onChange={(e) => setAssignPaymentNotes(e.target.value)}
            rows={2}
            className="border-slate-200 rounded-xl text-sm"
          />
        </form>
      </Modal>

      <Modal
        isOpen={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Extend Subscription"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setExtendOpen(false)} disabled={extendLoading}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleExtend} loading={extendLoading}>
              Extend
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExtend();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Extend subscription for{" "}
            <strong>{extendTarget?.plan_name || `ID ${extendTarget?.id}`}</strong> by:
          </p>
          <Input
            label="Extend by (days)"
            type="number"
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            placeholder="e.g. 30"
            min={1}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message={`Are you sure you want to cancel the subscription for ${
          cancelTarget?.user_email || `ID ${cancelTarget?.id}`
        }?`}
        confirmText="Cancel Subscription"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminSubscriptionsPageInner />
    </Suspense>
  );
}
