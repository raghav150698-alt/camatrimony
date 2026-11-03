"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, Button, Card, CardBody, CardHeader, Select, Textarea, EmptyState, Avatar, ConfirmDialog, type TabItem } from "@camatrimony/ui";
import { adminApi, resolveMediaUrl } from "@/lib/admin-api-client";

/** Normalize API snake_case (and dual-shape) KYC rows for the UI. */
function mapKycItem(row: any) {
  const userId = row.userId ?? row.user_id;
  const email = row.email || "";
  return {
    ...row,
    userId,
    name:
      row.name ||
      row.profile_created_by ||
      (email ? String(email).split("@")[0] : "Candidate"),
    email,
    idFile: resolveMediaUrl(row.idFile ?? row.govt_id_file ?? null) || null,
    degreeFile: resolveMediaUrl(row.degreeFile ?? row.degree_file ?? null) || null,
    submittedAt:
      row.submittedAt ||
      (row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : ""),
  };
}

export default function AdminKYCPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [kycItems, setKycItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus item for Split review panel
  const [activeItem, setActiveItem] = useState<any | null>(null);

  // Review actions states
  const [rejectionReason, setRejectionReason] = useState("Blurry document");
  const [customReason, setCustomReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [kycConfirm, setKycConfirm] = useState<"approve" | "reject" | null>(null);

  // Toast notification (UX FIX: replaced alert() calls)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load KYC lists based on tab
  const loadKYCQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.kyc({ status: activeTab });
      if (data.success) {
        const raw = data.kycRequests || data.data?.kycRequests || [];
        const list = raw.map(mapKycItem);
        setKycItems(list);
        if (list.length > 0) {
          setActiveItem(list[0]);
        } else {
          setActiveItem(null);
        }
      }
    } catch (err) {
      console.error("Failed to load KYC queue:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadKYCQueue();
  }, [loadKYCQueue]);

  // Approve & Verify
  const handleApprove = async (userId: string) => {
    setActionLoading(true);
    try {
      const data = await adminApi.approveKyc(userId);
      if (data.success) {
        showToast("KYC Approved! Candidate profile verified successfully.");
        const filtered = kycItems.filter((i) => i.userId !== userId);
        setKycItems(filtered);
        setActiveItem(filtered.length > 0 ? filtered[0] : null);
        setKycConfirm(null);
      } else {
        showToast("Approve action failed: " + (data.error || ""), "error");
      }
    } catch {
      showToast("Approve action failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject with reason
  const handleReject = async (userId: string) => {
    setActionLoading(true);
    const finalReason = rejectionReason === "Other" ? customReason : rejectionReason;
    if (!finalReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      setActionLoading(false);
      return;
    }

    try {
      const data = await adminApi.rejectKyc(userId, finalReason);
      if (data.success) {
        showToast("KYC Rejected successfully. Notification email dispatched.");
        const filtered = kycItems.filter((i) => i.userId !== userId);
        setKycItems(filtered);
        setActiveItem(filtered.length > 0 ? filtered[0] : null);
        setKycConfirm(null);
      } else {
        showToast("Reject action failed: " + (data.error || ""), "error");
      }
    } catch {
      showToast("Reject action failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // UX FIX: Request additional documents
  const handleRequestDocs = async (userId: string) => {
    setActionLoading(true);
    try {
      const data = await adminApi.requestDocs(
        userId,
        customReason || "Please upload a clearer copy of your documents for verification."
      );
      if (data.success) {
        showToast("Document request sent to candidate.");
        setCustomReason("");
      } else {
        showToast("Failed to send document request: " + (data.error || ""), "error");
      }
    } catch {
      showToast("Failed to send document request.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: TabItem[] = [
    { id: "pending", label: "Pending Reviews", badge: kycItems.length > 0 ? kycItems.length : undefined },
    { id: "approved", label: "Approved Logs" },
    { id: "rejected", label: "Rejected Logs" },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Module Heading */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          KYC Verification Center
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Audit uploaded CA academic degrees and government identity cards to award Green Verified trust badges.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-400 font-bold">Loading KYC review pipelines...</span>
        </div>
      ) : kycItems.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            title="KYC queue is empty!"
            description="There are currently no matrimonial candidates waiting for document audits."
          />
        </Card>
      ) : (
        /* Split Review Screen Canvas */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Pending submissions lists */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              Select Candidate To Review
            </h4>
            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
              {kycItems.map((item) => {
                const isActive = activeItem?.userId === item.userId;
                return (
                  <div
                    key={item.userId}
                    onClick={() => setActiveItem(item)}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 ${
                      isActive
                        ? "bg-white dark:bg-slate-900 border-maroon-500 shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={item.name || "Candidate"} size="md" />
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {(item.name || "Candidate").split(" ")[0]}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">{(item.name || "").split(" ").slice(1).join(" ")}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.submittedAt || ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center & Right: Detail Split Panels */}
          {activeItem && (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-start min-h-[500px]">
              {/* Center: Inline Document Viewer */}
              <div className="md:col-span-2 space-y-6">
                {/* Government ID file Card */}
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Government Identity Card</h3>
                  </CardHeader>
                  <CardBody className="p-4 bg-slate-50 dark:bg-slate-950/20">
                    <div className="w-full aspect-[16/10] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-sm">
                      {activeItem.idFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeItem.idFile}
                          alt="Government ID"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Government ID file missing.</span>
                      )}
                    </div>
                  </CardBody>
                </Card>

                {/* Academic Degree File Card */}
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Academic ICAI Degree Certificate</h3>
                  </CardHeader>
                  <CardBody className="p-4 bg-slate-50 dark:bg-slate-950/20">
                    <div className="w-full aspect-[16/10] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-sm">
                      {activeItem.degreeFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeItem.degreeFile}
                          alt="Degree Certificate"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Degree Certificate missing.</span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Right: Actions Audits Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Verification Decisions</h3>
                  </CardHeader>
                  <CardBody className="space-y-5">
                    <div className="space-y-1 select-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Candidate Info</span>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{activeItem.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">UID: {activeItem.userId}</p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/40 my-3" />

                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        loading={actionLoading}
                        onClick={() => setKycConfirm("approve")}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                      >
                        Approve & Verify
                      </Button>
                    </div>

                    {/* UX FIX: Request additional documents */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={actionLoading}
                        onClick={() => handleRequestDocs(activeItem.userId)}
                        className="w-full border-sky-200 text-sky-600 hover:bg-sky-50"
                      >
                        Request Additional Documents
                      </Button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/40 my-4" />

                    {/* Rejections form block */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-rose-500 uppercase tracking-widest">Reject KYC Submission</h5>
                      <Select
                        options={[
                          { label: "Blurry document", value: "Blurry document" },
                          { label: "Name/Details mismatch", value: "Name/Details mismatch" },
                          { label: "Expired identity card", value: "Expired identity card" },
                          { label: "Fake degree credentials", value: "Fake degree credentials" },
                          { label: "Other Reasons", value: "Other" },
                        ]}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Rejection Reason"
                        className="py-2.5 rounded-xl border-slate-200"
                      />

                      {rejectionReason === "Other" && (
                        <Textarea
                          placeholder="Provide detailed description of reasons for rejection resubmission..."
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          rows={3}
                          className="border-slate-200 rounded-xl"
                        />
                      )}

                      <Button
                        variant="primary"
                        loading={actionLoading}
                        onClick={() => setKycConfirm("reject")}
                        className="w-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
                      >
                        Reject Submission
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={kycConfirm === "approve"}
        onClose={() => setKycConfirm(null)}
        onConfirm={() => activeItem && handleApprove(activeItem.userId)}
        title="Approve KYC?"
        message="This will mark the candidate as verified and award the verified badge."
        confirmText="Approve KYC"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={kycConfirm === "reject"}
        onClose={() => setKycConfirm(null)}
        onConfirm={() => activeItem && handleReject(activeItem.userId)}
        title="Reject KYC?"
        message={`Reject this submission with reason: "${rejectionReason === "Other" ? customReason || "(enter reason above)" : rejectionReason}"`}
        confirmText="Reject KYC"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
