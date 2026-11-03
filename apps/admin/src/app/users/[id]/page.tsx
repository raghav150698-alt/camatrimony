"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button, Badge, Tabs, Card, CardBody, CardHeader, Textarea, Avatar, Select, Input, DataTable, ConfirmDialog, ToastContainer, FileUpload, type Column, type ToastMessage, type ToastType } from "@camatrimony/ui";
import { validateUploadFile } from "@camatrimony/shared";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { adminApi } from "@/lib/admin-api-client";
import AdminSecureMedia from "@/components/AdminSecureMedia";

export const runtime = "edge";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function packageValidityDays(pkg: any): number {
  return Number(pkg?.validity_days ?? pkg?.validityDays ?? 0);
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = (params?.id as string) || "";

  const [profile, setProfile] = useState<any | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>({ interestsSent: [], interestsReceived: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (title: string, type: ToastType = "success", message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [paymentProofName, setPaymentProofName] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);
  const [manualPaymentNotes, setManualPaymentNotes] = useState("");
  const [planStartDate, setPlanStartDate] = useState(todayDateInputValue);
  const [planValidityDays, setPlanValidityDays] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"active" | "suspended" | "banned">("active");
  const [statusReason, setStatusReason] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [docApproving, setDocApproving] = useState<"govt_id" | "degree" | null>(null);
  const [expandedKycDocs, setExpandedKycDocs] = useState<Record<string, boolean>>({});
  const [kycPanelExpanded, setKycPanelExpanded] = useState(true);
  const [kycConfirm, setKycConfirm] = useState<"approve" | "reject" | null>(null);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await adminApi.user(userId);
      if (data.success) {
        const p = data.profile || data.data?.profile;
        setProfile(p);
        setSubscriptions(data.subscriptions || data.data?.subscriptions || []);
        setPayments(data.payments || data.data?.payments || []);
        setUnlocks(data.unlocks || data.data?.unlocks || []);
        setReports(data.reports || data.data?.reports || []);
        setActivity(data.activity || data.data?.activity || { interestsSent: [], interestsReceived: [] });
        setNotes(p?.admin_notes || "");
      } else {
        console.error("Error loading profile:", data.error);
      }
    } catch (err) {
      console.error("Failed to load user detail:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (profile?.is_verified === 1) {
      setKycPanelExpanded(false);
    }
  }, [profile?.is_verified]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.packages();
        if (cancelled || !data.success) return;
        const list = data.packages || data.data?.packages || [];
        setPackages(list);
        if (list.length > 0) {
          setSelectedPlan((prev) => {
            const next = prev || String(list[0].id);
            const pkg = list.find((p: any) => String(p.id) === next);
            if (pkg) setPlanValidityDays(String(packageValidityDays(pkg) || ""));
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to load packages:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const data = await adminApi.updateUser(userId, { adminNotes: notes });
      if (data.success) {
        setProfile({ ...profile, admin_notes: notes });
        showToast("Admin sticky notes saved successfully.");
      } else {
        showToast("Failed to save admin notes: " + (data.error || ""), "error");
      }
    } catch {
      showToast("Error saving notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleApproveDocument = async (document: "govt_id" | "degree") => {
    setDocApproving(document);
    try {
      const data = await adminApi.approveKycDocument(userId, document);
      if (data.success) {
        const patch =
          document === "govt_id"
            ? { govt_id_status: "approved", govtIdStatus: "approved" }
            : { degree_status: "approved", degreeStatus: "approved" };
        setProfile({ ...profile, ...patch });
        showToast(
          document === "govt_id" ? "Government ID approved" : "Degree certificate approved",
          "success",
          data.message || "Document marked as approved."
        );
      } else {
        showToast("Document approval failed", "error", data.error || "Please try again.");
      }
    } catch {
      showToast("Document approval failed", "error", "Could not approve this document.");
    } finally {
      setDocApproving(null);
    }
  };

  const handleVerifyKYC = async (approve: boolean) => {
    setVerifyLoading(true);
    try {
      const data = approve
        ? await adminApi.approveKyc(userId)
        : await adminApi.rejectKyc(userId, "KYC Document Verification Mismatch");
      if (data.success) {
        setKycConfirm(null);
        setProfile({
          ...profile,
          is_verified: approve ? 1 : 0,
          ...(approve ? {} : { user_status: "pending_verification" }),
        });
        if (approve) {
          showToast(
            "KYC approved successfully",
            "success",
            data.message || "Candidate is verified. You can now activate their account."
          );
          setKycPanelExpanded(false);
        } else {
          showToast(
            "KYC verification rejected",
            "success",
            data.message || "The candidate has been notified to resubmit documents."
          );
        }
      } else {
        showToast("KYC action failed", "error", data.error || "Please try again.");
      }
    } catch {
      showToast("KYC verification error", "error", "Could not update KYC status. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePaymentProofSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const validationError = validateUploadFile(file, "payment_proof");
    if (validationError) {
      setProofUploadError(validationError);
      setPaymentProofUrl(null);
      setPaymentProofName(null);
      return;
    }

    setProofUploading(true);
    setProofUploadError(null);
    try {
      const data = await adminApi.uploadPaymentProof(userId, file);
      if (data.success && data.url) {
        setPaymentProofUrl(data.url);
        setPaymentProofName(data.fileName || file.name);
        showToast("Payment proof uploaded", "success", "You can now activate the plan.");
      } else {
        setPaymentProofUrl(null);
        setPaymentProofName(null);
        setProofUploadError(data.error || "Upload failed");
        showToast("Upload failed", "error", data.error || "Could not upload payment proof.");
      }
    } catch {
      setPaymentProofUrl(null);
      setPaymentProofName(null);
      setProofUploadError("Upload failed. Please try again.");
      showToast("Upload failed", "error", "Could not upload payment proof.");
    } finally {
      setProofUploading(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan) {
      showToast("Select a package first.", "error");
      return;
    }
    if (!paymentProofUrl) {
      showToast("Payment proof required", "error", "Upload proof of payment before activating the plan.");
      return;
    }
    const days = Number(planValidityDays);
    if (!days || days < 1) {
      showToast("Invalid plan period", "error", "Enter plan period in days (from Package Catalog).");
      return;
    }
    setAssignLoading(true);
    try {
      const data = await adminApi.assignSubscription({
        userId,
        packageId: selectedPlan,
        proofUrl: paymentProofUrl,
        adminNotes: manualPaymentNotes.trim() || undefined,
        startDate: planStartDate,
        validityDays: days,
      });
      if (data.success) {
        showToast("Plan manually assigned successfully.");
        setPaymentProofUrl(null);
        setPaymentProofName(null);
        setManualPaymentNotes("");
        setPlanStartDate(todayDateInputValue());
        await loadUser();
      } else {
        showToast("Manual package assignment failed", "error", data.error || "");
      }
    } catch {
      showToast("Error assigning package plan.", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if ((targetStatus === "banned" || targetStatus === "suspended") && !statusReason.trim()) {
      showToast("A reason is required.", "error");
      return;
    }
    setStatusLoading(true);
    try {
      const data = await adminApi.updateUser(userId, {
        status: targetStatus,
        banReason:
          targetStatus === "banned" || targetStatus === "suspended"
            ? statusReason.trim()
            : undefined,
      });
      if (data.success) {
        setProfile({ ...profile, user_status: targetStatus });
        setConfirmOpen(false);
        setStatusReason("");
        showToast(`User account status modified to ${targetStatus.toUpperCase()} successfully.`);
      } else {
        showToast("Failed to adjust account status: " + (data.error || ""), "error");
      }
    } catch {
      showToast("Error updating account status.", "error");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs text-slate-500 font-bold">Retrieving complete candidate data files...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md mx-auto mt-12">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">Candidate Not Found</h3>
        <p className="text-sm text-slate-400 mt-1">This user ID does not match any register in CA Matrimony.</p>
        <Link href="/users">
          <Button variant="ghost" className="mt-4">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const tabList = [
    { id: "overview", label: "Profile Overview" },
    { id: "documents", label: "Verification Documents" },
    { id: "subscription", label: "Premium Plans" },
    { id: "activity", label: "Activity Logs" },
    { id: "payments", label: "Transactions" },
    { id: "safety", label: "Reports & Flags", badge: reports.length > 0 ? reports.length : undefined },
  ];

  const subscriptionColumns: Column<any>[] = [
    { key: "plan_name", header: "Plan Name", render: (row: any) => <Badge variant={row.status === "active" ? "success" : "neutral"}>{row.plan_name}</Badge> },
    { key: "start_date", header: "Start Date", render: (row: any) => <span className="text-xs font-semibold">{new Date(row.start_date).toLocaleDateString("en-IN")}</span> },
    { key: "end_date", header: "Expiry Date", render: (row: any) => <span className="text-xs font-semibold">{new Date(row.end_date).toLocaleDateString("en-IN")}</span> },
    { key: "status", header: "Status", render: (row: any) => <Badge variant={row.status === "active" ? "success" : "neutral"} size="sm">{row.status}</Badge> },
  ];

  const interestColumns: Column<any>[] = [
    { key: "target_email", header: "Recipient Candidate", render: (row: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.target_email?.split("@")[0] || "Candidate"}</span> },
    { key: "status", header: "Status", render: (row: any) => <Badge variant={row.status === "accepted" ? "success" : row.status === "pending" ? "warning" : "neutral"} size="sm">{row.status}</Badge> },
    { key: "created_at", header: "Timestamp", render: (row: any) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString("en-IN")}</span> },
  ];

  const receivedColumns: Column<any>[] = [
    { key: "target_email", header: "Sender Candidate", render: (row: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.target_email?.split("@")[0] || "Candidate"}</span> },
    { key: "status", header: "Status", render: (row: any) => <Badge variant={row.status === "accepted" ? "success" : row.status === "pending" ? "warning" : "neutral"} size="sm">{row.status}</Badge> },
    { key: "created_at", header: "Timestamp", render: (row: any) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString("en-IN")}</span> },
  ];

  const paymentColumns: Column<any>[] = [
    { key: "id", header: "Payment Transaction ID", render: (row: any) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "plan_name", header: "Plan Purchased", render: (row: any) => <Badge variant="maroon">{row.plan_name || "Premium Plan"}</Badge> },
    { key: "amount", header: "Amount Paid", render: (row: any) => <span className="font-bold text-slate-800 dark:text-slate-200">₹{(row.amount || 0).toLocaleString("en-IN")}</span> },
    { key: "status", header: "Captured Status", render: (row: any) => <Badge variant={row.status === "captured" || row.status === "success" ? "success" : "danger"} size="sm">{row.status}</Badge> },
    { key: "created_at", header: "Date", render: (row: any) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString("en-IN")}</span> },
  ];

  const reportColumns: Column<any>[] = [
    { key: "reporter_email", header: "Reporter Email", render: (row: any) => <span className="font-bold text-slate-700 dark:text-slate-300">{row.reporter_email}</span> },
    { key: "reason", header: "Violation Type", render: (row: any) => <Badge variant="danger" size="sm">{row.reason}</Badge> },
    { key: "details", header: "Detailed Evidence", render: (row: any) => <p className="text-xs max-w-sm truncate">{row.details || "No comments shared."}</p> },
    { key: "status", header: "Status", render: (row: any) => <Badge variant={row.status === "open" ? "warning" : "success"} size="sm">{row.status}</Badge> },
  ];

  const packageOptions = packages.map((p: any) => ({
    label: `${p.name} — ₹${Number(p.price || 0).toLocaleString("en-IN")} · ${p.validity_days || p.validityDays || "?"} days · ${p.contact_limit ?? p.contactLimit ?? "?"} contacts`,
    value: String(p.id),
  }));

  const selectedPackage = packages.find((p: any) => String(p.id) === selectedPlan);
  const planExpiryPreview = (() => {
    const days = Number(planValidityDays);
    if (!planStartDate || !days || days < 1) return null;
    const start = new Date(`${planStartDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    return end.toLocaleDateString("en-IN");
  })();

  const handlePlanSelect = (packageId: string) => {
    setSelectedPlan(packageId);
    const pkg = packages.find((p: any) => String(p.id) === packageId);
    if (pkg) setPlanValidityDays(String(packageValidityDays(pkg) || ""));
  };

  const isKycApproved = profile.is_verified === 1;
  const canActivateAccount = isKycApproved && profile.user_status !== "active";

  const govtIdUrl = profile.govt_id_file || profile.govtIdFile;
  const degreeUrl = profile.degree_file || profile.degreeFile;
  const govtIdStatus = govtIdUrl ? profile.govt_id_status || profile.govtIdStatus || "pending" : null;
  const degreeStatus = degreeUrl ? profile.degree_status || profile.degreeStatus || "pending" : null;

  const kycDocuments = [
    {
      key: "degree" as const,
      title: "Academic Degree Certificate",
      meta: profile.highest_degree || "CA Certificate",
      url: degreeUrl,
      status: degreeStatus,
      emptyLabel: "Degree document file is missing or unavailable.",
    },
    {
      key: "govt_id" as const,
      title: "Government Identity Card",
      meta: "National Aadhaar / Passport",
      url: govtIdUrl,
      status: govtIdStatus,
      emptyLabel: "Identity document file is missing or unavailable.",
    },
  ];

  const uploadedKycDocs = kycDocuments.filter((doc) => doc.url);
  const approvedKycCount = uploadedKycDocs.filter((doc) => doc.status === "approved").length;
  const allKycDocsApproved = uploadedKycDocs.length > 0 && approvedKycCount === uploadedKycDocs.length;
  const canApproveFullKyc = !isKycApproved && allKycDocsApproved;

  const renderDocStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="neutral" size="sm">Not uploaded</Badge>;
    if (status === "approved") return <Badge variant="success" size="sm">Approved</Badge>;
    if (status === "rejected") return <Badge variant="danger" size="sm">Rejected</Badge>;
    return <Badge variant="warning" size="sm">Pending review</Badge>;
  };

  const renderKycDocumentsPanel = () => {
    const showCompactPanel = isKycApproved && !kycPanelExpanded;

    if (showCompactPanel) {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">KYC verified</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All documents approved · {approvedKycCount}/{uploadedKycDocs.length} complete
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setKycPanelExpanded(true)} className="text-slate-500">
            Show documents
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">KYC Verification Documents</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {allKycDocsApproved && !isKycApproved
                ? "All documents approved. Use Approve KYC above to finish verification."
                : "Review each document below and approve one by one. Final KYC approval unlocks account activation."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uploadedKycDocs.length > 0 && (
              <Badge variant={allKycDocsApproved ? "success" : "warning"} size="sm">
                {approvedKycCount}/{uploadedKycDocs.length} documents approved
              </Badge>
            )}
            {isKycApproved && (
              <Button variant="ghost" size="sm" onClick={() => setKycPanelExpanded(false)} className="text-slate-500">
                Collapse
                <ChevronUp className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <div className={`grid gap-3 ${allKycDocsApproved ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 gap-6"}`}>
          {kycDocuments.map((doc) => {
            const isApproved = doc.status === "approved";
            const isCollapsed = isApproved && !expandedKycDocs[doc.key];

            if (isCollapsed) {
              return (
                <div
                  key={doc.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{doc.title}</span>
                    {renderDocStatusBadge(doc.status)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-slate-500"
                    onClick={() => setExpandedKycDocs((prev) => ({ ...prev, [doc.key]: true }))}
                  >
                    View
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            }

            return (
              <Card key={doc.key}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{doc.title}</h3>
                  <div className="flex items-center gap-2">
                    {renderDocStatusBadge(doc.status)}
                    {isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-slate-400"
                        onClick={() => setExpandedKycDocs((prev) => ({ ...prev, [doc.key]: false }))}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-slate-400">{doc.key === "degree" ? "Credentials type:" : "Identity Document:"}</span>
                    <Badge variant="neutral" size="sm">{doc.meta}</Badge>
                  </div>
                  <div className="w-full aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 overflow-hidden relative shadow-sm">
                    <AdminSecureMedia url={doc.url} alt={doc.title} emptyLabel={doc.emptyLabel} />
                  </div>
                  {doc.url && doc.status !== "approved" && !isKycApproved && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      loading={docApproving === doc.key}
                      disabled={docApproving !== null && docApproving !== doc.key}
                      onClick={() => handleApproveDocument(doc.key)}
                    >
                      Approve {doc.key === "govt_id" ? "Government ID" : "Degree Certificate"}
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      <ToastContainer toasts={toasts} onClose={dismissToast} />

      <Link href="/users" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-maroon-500 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.profile_created_by || "Candidate"} isVerified={profile.is_verified === 1} size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {profile.user_email ? profile.user_email.split("@")[0] : "Verified Member"}
              </h2>
              <Badge variant={profile.user_status === "active" ? "success" : profile.user_status === "suspended" ? "warning" : "danger"} size="sm" showDot>
                {profile.user_status || "Active"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {profile.highest_degree || "CA"} • {profile.occupation || "Auditor"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Email: {profile.user_email || "Not shared"} | Phone: {profile.user_phone || "Not shared"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isKycApproved ? (
            <Button
              variant="primary"
              size="sm"
              disabled
              className="!bg-emerald-600 !border-emerald-600 !text-white cursor-default !opacity-100 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Approved
            </Button>
          ) : (
            <Button
              variant={canApproveFullKyc ? "primary" : "outline"}
              size="sm"
              loading={verifyLoading}
              disabled={!canApproveFullKyc}
              title={!canApproveFullKyc ? "Approve each uploaded document first" : "All documents approved — complete KYC verification"}
              onClick={() => setKycConfirm("approve")}
              className={
                canApproveFullKyc
                  ? "!bg-emerald-600 hover:!bg-emerald-700 active:!bg-emerald-800 !border-emerald-600 focus:!ring-emerald-500 shadow-md"
                  : "!bg-transparent !text-slate-400 !border-slate-600 dark:!border-slate-700 disabled:!opacity-50"
              }
            >
              Approve KYC
            </Button>
          )}
          {profile.user_status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => { setTargetStatus("suspended"); setStatusReason(""); setConfirmOpen(true); }} className="border-amber-200 text-amber-600 hover:bg-amber-50">
              Suspend Account
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!canActivateAccount}
              title={!isKycApproved ? "Approve KYC before activating this account" : undefined}
              onClick={() => { setTargetStatus("active"); setStatusReason(""); setConfirmOpen(true); }}
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Activate Account
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setTargetStatus("banned"); setStatusReason(""); setConfirmOpen(true); }} className="bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/50">
            Ban Account
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        {renderKycDocumentsPanel()}
      </div>

      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} variant="pills" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-sm" />

      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">About Candidate</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    {profile.about_me || "This candidate has not written a personal bio block yet."}
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Matrimonial Credentials</h3>
                </CardHeader>
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm font-semibold">
                  <div>
                    <span className="text-slate-400">Dietary Preferences:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.diet || "Vegetarian"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Marital Status:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.marital_status || "Never Married"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Religion / Caste / Subcaste:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                      {profile.religion || "Hindu"} • {profile.caste || "Brahmin"} • {profile.subcaste || "None"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Gothram:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.gothram || "Not Shared"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Annual Income:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.annual_income || "₹15 - ₹20 LPA"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">NRI Status:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.is_nri === 1 ? "NRI Member" : "Indian Resident"}</p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Partner Search Preferences</h3>
                </CardHeader>
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm font-semibold">
                  <div>
                    <span className="text-slate-400">Age Bracket:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.partner_age_range || "24 - 30 Yrs"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Education Requirement:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.partner_education || "CA/CS/MBA"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Expected Caste:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.partner_caste || "Same Caste"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Minimum Income:</span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{profile.partner_income_min || "₹15 LPA"}</p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Sticky Admin Notes</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Textarea placeholder="Enter private administrative tracking notes about this candidate..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="border-slate-200 rounded-xl" />
                  <Button variant="primary" size="sm" className="w-full" loading={savingNotes} onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Activity Ratios</h3>
                </CardHeader>
                <CardBody className="text-sm font-semibold space-y-3.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profile Views:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{profile.profile_views_count || 0} Views</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Login Counter:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{profile.login_count || 0} Logins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Login:</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      {profile.last_login_at ? new Date(profile.last_login_at).toLocaleDateString("en-IN") : "Never Logged"}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "documents" && renderKycDocumentsPanel()}

        {activeTab === "subscription" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Membership History</h3>
                </CardHeader>
                <CardBody>
                  <DataTable
                    columns={subscriptionColumns}
                    data={subscriptions}
                    emptyTitle="No membership records found."
                    emptyDescription="This candidate is currently on the default Free Tier package."
                  />
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Assign Premium Package</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Select
                    id="user-detail-assign-plan"
                    label="Select Plan"
                    options={packageOptions}
                    value={selectedPlan}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    placeholder={packages.length === 0 ? "Loading packages…" : "Select a package"}
                    disabled={packages.length === 0}
                    helperText={
                      packages.length === 0
                        ? "No packages loaded yet."
                        : selectedPackage
                        ? `From Package Catalog: ${selectedPackage.name} · default ${packageValidityDays(selectedPackage)} days`
                        : "Choose a plan from the Package Catalog."
                    }
                  />
                  <Input
                    id="user-detail-plan-start"
                    label="Plan start date"
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    helperText="Membership begins on this date."
                  />
                  <Input
                    id="user-detail-plan-period"
                    label="Plan period (days)"
                    type="number"
                    min={1}
                    value={planValidityDays}
                    onChange={(e) => setPlanValidityDays(e.target.value)}
                    placeholder={selectedPackage ? String(packageValidityDays(selectedPackage)) : "Days"}
                    helperText={
                      planExpiryPreview
                        ? `Expires on ${planExpiryPreview} · edit to override catalog default`
                        : "Prefilled from Package Catalog — adjust if needed"
                    }
                  />
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Proof of payment <span className="text-rose-500">*</span>
                    </span>
                    <FileUpload
                      label="Upload UPI screenshot, receipt, or bank transfer proof"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      maxSizeMB={5}
                      onFileSelect={handlePaymentProofSelect}
                      error={proofUploadError || undefined}
                    />
                    {proofUploading && (
                      <p className="text-xs font-semibold text-slate-500">Uploading proof…</p>
                    )}
                    {paymentProofUrl && paymentProofName && !proofUploading && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ {paymentProofName} uploaded
                      </p>
                    )}
                  </div>
                  <Textarea
                    placeholder="Optional notes — UPI ref, cash receipt #, who collected payment…"
                    value={manualPaymentNotes}
                    onChange={(e) => setManualPaymentNotes(e.target.value)}
                    rows={2}
                    className="border-slate-200 rounded-xl text-sm"
                  />
                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full font-bold"
                    loading={assignLoading || proofUploading}
                    onClick={handleAssignPlan}
                    disabled={!selectedPlan || packages.length === 0 || !paymentProofUrl || proofUploading}
                  >
                    Manually Activate Plan
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Sent Match Interests</h3>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={interestColumns}
                  data={activity.interestsSent}
                  emptyTitle="No interests sent."
                  emptyDescription="This user has not sent matching interest requests yet."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Received Match Interests</h3>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={receivedColumns}
                  data={activity.interestsReceived}
                  emptyTitle="No interests received."
                  emptyDescription="No candidates have expressed interest in this profile yet."
                />
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === "payments" && (
          <Card>
            <CardHeader>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Transaction Ledgers</h3>
            </CardHeader>
            <CardBody>
              <DataTable
                columns={paymentColumns}
                data={payments}
                emptyTitle="No payments recorded."
                emptyDescription="Payments and revenue logs for this user will display here."
              />
            </CardBody>
          </Card>
        )}

        {activeTab === "safety" && (
          <Card>
            <CardHeader>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Complaints Filed Against Profile</h3>
            </CardHeader>
            <CardBody>
              <DataTable
                columns={reportColumns}
                data={reports}
                emptyTitle="Glorious! No complaints filed."
                emptyDescription="This profile maintains clean standing without flags."
              />
            </CardBody>
          </Card>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setStatusReason(""); }}
        onConfirm={handleStatusChange}
        title={targetStatus === "banned" ? "Confirm Account Ban?" : targetStatus === "suspended" ? "Confirm Suspension?" : "Reactivate Account?"}
        message={
          targetStatus === "banned"
            ? "Are you sure you want to BAN this user? This blocks access completely and hides the profile."
            : targetStatus === "suspended"
            ? "Are you sure you want to suspend this user? This temporarily hides their profile card."
            : "This reactivates the candidate. Their profile will be visible in matches search again."
        }
        confirmText="Confirm Status Change"
        variant={targetStatus === "banned" ? "danger" : "primary"}
        loading={statusLoading}
        reasonRequired={targetStatus === "banned" || targetStatus === "suspended"}
        reasonLabel={targetStatus === "banned" ? "Ban reason" : "Suspension reason"}
        reasonPlaceholder="Required — explain why this action is taken"
        reasonValue={statusReason}
        onReasonChange={setStatusReason}
      />

      <ConfirmDialog
        isOpen={!!kycConfirm}
        onClose={() => setKycConfirm(null)}
        onConfirm={() => handleVerifyKYC(kycConfirm === "approve")}
        title={kycConfirm === "approve" ? "Approve KYC?" : "Reject / Revoke KYC?"}
        message={
          kycConfirm === "approve"
            ? "This will mark the candidate as verified and award the verified badge."
            : "This will reject or revoke KYC verification for this candidate."
        }
        confirmText={kycConfirm === "approve" ? "Approve KYC" : "Reject KYC"}
        variant={kycConfirm === "approve" ? "primary" : "danger"}
        loading={verifyLoading}
      />
    </div>
  );
}
