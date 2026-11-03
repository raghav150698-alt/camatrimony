"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, Button, Badge, Card, CardBody, DataTable, Modal, Select, Textarea, Input, EmptyState, type TabItem, type Column } from "@camatrimony/ui";
import { adminApi } from "@/lib/admin-api-client";

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab) params.status = activeTab;
      const data = await adminApi.support(params);
      if (data.success) {
        setTickets(data.tickets || data.data?.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load support tickets:", err);
      showToast("Failed to load tickets", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setStatus(ticket.status || "open");
    setPriority(ticket.priority || "medium");
    setAssignedTo(ticket.assigned_to || "");
    setAdminNotes(ticket.admin_notes || "");
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const payload: any = {};
      if (status !== selectedTicket.status) payload.status = status;
      if (priority !== selectedTicket.priority) payload.priority = priority;
      if (assignedTo !== (selectedTicket.assigned_to || "")) payload.assignedTo = assignedTo;
      if (adminNotes !== (selectedTicket.admin_notes || "")) payload.adminNotes = adminNotes;
      if (replyText.trim()) payload.replyMessage = replyText.trim();

      const data = await adminApi.updateSupportTicket(selectedTicket.id, payload);
      if (data.success) {
        showToast("Ticket updated successfully");
        setTickets(
          tickets.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  status: payload.status || t.status,
                  priority: payload.priority || t.priority,
                  assigned_to: payload.assignedTo || t.assigned_to,
                  admin_notes: payload.adminNotes || t.admin_notes,
                  messages: payload.replyMessage
                    ? [...(t.messages || []), { sender: "admin", text: payload.replyMessage, sent_at: new Date().toISOString() }]
                    : t.messages,
                }
              : t
          )
        );
        setSelectedTicket(null);
      } else {
        showToast(data.error || "Failed to update ticket", "error");
      }
    } catch (err) {
      console.error("Ticket update failed:", err);
      showToast("Failed to update ticket", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (row: any) => (
        <button onClick={() => openTicket(row)} className="text-left font-bold text-slate-800 dark:text-slate-100 hover:text-maroon-600">
          {row.subject}
        </button>
      ),
    },
    { key: "user_email", header: "User" },
    {
      key: "category",
      header: "Category",
      render: (row: any) => <Badge variant="neutral" size="sm">{row.category || "General"}</Badge>,
    },
    {
      key: "priority",
      header: "Priority",
      render: (row: any) => {
        const variant = row.priority === "high" ? "danger" : row.priority === "medium" ? "warning" : "info";
        return <Badge variant={variant} size="sm">{row.priority || "low"}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => {
        const variant = row.status === "open" ? "warning" : row.status === "resolved" ? "success" : "neutral";
        return <Badge variant={variant} size="sm">{row.status || "open"}</Badge>;
      },
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (row: any) => <span className="text-xs text-slate-500">{new Date(row.created_at || Date.now()).toLocaleDateString("en-IN")}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <Button variant="outline" size="sm" onClick={() => openTicket(row)}>
          Manage
        </Button>
      ),
    },
  ];

  const tabs: TabItem[] = [
    { id: "", label: "All" },
    { id: "open", label: "Open", badge: activeTab === "open" ? tickets.length : undefined },
    { id: "in_progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
    { id: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Support Tickets</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage user support requests, assign agents, update status, and reply to members.
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        emptyTitle="No tickets found"
        emptyDescription="There are no support tickets in this status."
      />

      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject || "Support Ticket"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedTicket(null)} disabled={actionLoading}>
              Close
            </Button>
            <Button variant="gold" onClick={handleUpdate} loading={actionLoading}>
              Update Ticket
            </Button>
          </>
        }
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p><span className="font-semibold">User:</span> {selectedTicket.user_email || selectedTicket.user_id}</p>
              <p><span className="font-semibold">Created:</span> {new Date(selectedTicket.created_at || Date.now()).toLocaleString("en-IN")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                options={[
                  { label: "Open", value: "open" },
                  { label: "In Progress", value: "in_progress" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Closed", value: "closed" },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <Select
                label="Priority"
                options={[
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" },
                ]}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
              <Input
                label="Assigned To"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Admin user ID"
              />
            </div>

            <Textarea
              label="Admin Notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this ticket"
            />

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Conversation</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {(selectedTicket.messages || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No messages yet.</p>
                ) : (
                  (selectedTicket.messages || []).map((msg: any, idx: number) => (
                    <div key={idx} className={`text-sm p-3 rounded-xl ${msg.sender === "admin" ? "bg-maroon-50 dark:bg-maroon-950/20 ml-8" : "bg-slate-50 dark:bg-slate-800 mr-8"}`}>
                      <p className="text-xs font-bold text-slate-500 mb-1">{msg.sender === "admin" ? "Admin" : "User"}</p>
                      <p className="text-slate-700 dark:text-slate-300">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
              <Textarea
                label="Reply to user"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                className="mt-3"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
