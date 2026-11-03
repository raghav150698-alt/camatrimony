"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Button,
  Input,
  Select,
  Switch,
  DataTable,
  Pagination,
  Modal,
  Badge,
  EmptyState,
  Textarea,
  ConfirmDialog,
  type Column,
} from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

interface AnnouncementPayload {
  title: string;
  message: string;
  createdAt?: string;
  createdBy?: string;
}

interface AnnouncementRaw {
  key: string;
  value: string;
}

interface Announcement extends AnnouncementPayload {
  key: string;
}

interface CommunicationListResponse {
  success: boolean;
  announcements: AnnouncementRaw[];
  error?: string;
  message?: string;
}

interface CreateCommunicationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const emailTemplateOptions = [
  { label: "None (notification only)", value: "" },
  { label: "Welcome", value: "welcome" },
  { label: "Plan Expiring", value: "plan_expiring" },
  { label: "Payment Confirmed", value: "payment_confirmed" },
  { label: "KYC Approved", value: "kyc_approved" },
  { label: "KYC Rejected", value: "kyc_rejected" },
  { label: "Account Suspended", value: "account_suspended" },
  { label: "Refund Processed", value: "refund_processed" },
  { label: "Interest Received", value: "interest_received" },
  { label: "Interest Accepted", value: "interest_accepted" },
];

function AdminCommunicationPageInner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.client.get("/admin/communication");
      const data = res as CommunicationListResponse;
      if (data.success) {
        const raw = data.announcements || [];
        const parsed: Announcement[] = raw.map((item) => {
          let payload: Partial<AnnouncementPayload> = {};
          try {
            payload = JSON.parse(item.value);
          } catch {
            payload = { title: "Stored value", message: item.value };
          }
          return {
            key: item.key,
            title: payload.title || "Untitled",
            message: payload.message || "",
            createdAt: payload.createdAt,
            createdBy: payload.createdBy,
          };
        });
        setAnnouncements(parsed);
      } else {
        setError(data.error || "Failed to load announcements.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setBroadcast(false);
    setTemplateName("");
    setSendError(null);
    setBroadcastConfirmOpen(false);
  };

  const requestSend = () => {
    if (!title.trim() || !message.trim()) {
      setSendError("Title and message are required.");
      return;
    }
    setSendError(null);
    if (broadcast) {
      setBroadcastConfirmOpen(true);
      return;
    }
    void handleCreate();
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      setSendError("Title and message are required.");
      return;
    }

    setSendLoading(true);
    setSendError(null);

    try {
      const payload: {
        title: string;
        message: string;
        broadcast: boolean;
        templateName?: string;
      } = {
        title: title.trim(),
        message: message.trim(),
        broadcast,
      };

      if (broadcast && templateName) {
        payload.templateName = templateName;
      }

      const res = await adminApi.client.post("/admin/communication", payload);
      const data = res as CreateCommunicationResponse;
      if (data.success) {
        setBroadcastConfirmOpen(false);
        setModalOpen(false);
        resetForm();
        setCurrentPage(1);
        showToast(
          data.message ||
            (broadcast
              ? "Announcement created and broadcast sent."
              : "Announcement created successfully."),
        );
        await fetchAnnouncements();
      } else {
        setBroadcastConfirmOpen(false);
        setSendError(data.error || "Failed to create announcement.");
      }
    } catch (err) {
      setBroadcastConfirmOpen(false);
      setSendError(err instanceof Error ? err.message : "Network request failed.");
    } finally {
      setSendLoading(false);
    }
  };

  const closeModal = () => {
    if (sendLoading) return;
    setModalOpen(false);
    resetForm();
  };

  const totalItems = announcements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIdx = (currentPageSafe - 1) * pageSize;
  const paginatedAnnouncements = announcements.slice(startIdx, startIdx + pageSize);

  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">{row.title}</span>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <p className="truncate max-w-xs text-xs text-slate-600 dark:text-slate-400">
          {row.message}
        </p>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.createdAt ? new Date(row.createdAt).toLocaleString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (row) => (
        <Badge variant="neutral" size="sm">
          {row.createdBy || "Admin"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="info" size="sm">
          Portal
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none">
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
            Communications Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage portal announcements and broadcast communications to members.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setModalOpen(true)}>
          New Announcement
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-3xl p-4"
        >
          <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{error}</p>
        </div>
      )}

      {!loading && announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Create your first announcement to share updates with members."
          actionText="Create Announcement"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginatedAnnouncements}
            loading={loading}
            emptyTitle="No announcements found"
            emptyDescription="Create a new announcement to broadcast updates to members."
            getRowId={(row) => row.key}
          />
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPageSafe}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen && !broadcastConfirmOpen}
        onClose={closeModal}
        title="Create & Broadcast Announcement"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={sendLoading}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={requestSend} loading={sendLoading}>
              Send Announcement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {sendError && (
            <p
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900"
            >
              {sendError}
            </p>
          )}
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New feature launch / Maintenance window"
          />
          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Announcement message for members..."
            rows={5}
          />
          <Switch
            checked={broadcast}
            onChange={setBroadcast}
            label="Broadcast to all active users"
            description="Sends a system notification and optional templated email."
          />
          {broadcast && (
            <Select
              label="Email Template"
              options={emailTemplateOptions}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder=""
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={broadcastConfirmOpen}
        onClose={() => {
          if (sendLoading) return;
          setBroadcastConfirmOpen(false);
        }}
        onConfirm={handleCreate}
        title="Broadcast to all users?"
        message={`This will notify every active member with “${title.trim()}”.${
          templateName ? ` Email template: ${templateName}.` : " No email template selected."
        } Continue?`}
        confirmText="Broadcast Now"
        cancelText="Back"
        variant="danger"
        loading={sendLoading}
      />
    </div>
  );
}

export default function AdminCommunicationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
      <AdminCommunicationPageInner />
    </Suspense>
  );
}
