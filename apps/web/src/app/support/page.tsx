"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ChevronRight,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button, Select } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getSupportTickets,
  createSupportTicket,
  replyToSupportTicket,
} from "@camatrimony/api-client";

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function loadTickets() {
      setFetching(true);
      try {
        const res = await getSupportTickets(user!.uid);
        if (res.success && res.data) {
          setTickets(res.data as any[]);
        }
      } catch (err) {
        console.error("Tickets fetch error:", err);
      } finally {
        setFetching(false);
      }
    }
    loadTickets();
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !message) return;
    setSubmitting(true);
    try {
      const res = await createSupportTicket(user.uid, subject, category, priority, message);
      if (res.success && res.data) {
        setTickets(prev => [res.data, ...prev]);
        setShowForm(false);
        setSubject("");
        setMessage("");
        setCategory("general");
        setPriority("medium");
      }
    } catch (err) {
      console.error("Create ticket error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText) return;
    setReplying(true);
    try {
      const res = await replyToSupportTicket(selectedTicket.id, "user", replyText);
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setReplyText("");
        // Update in list
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? res.data : t));
      }
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setReplying(false);
    }
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Header */}
        <PageHeader eyebrow="WE’RE HERE TO HELP" title="Let’s sort it out." description="Ask a question and follow your support requests."><button className="site-action" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "New request"}</button></PageHeader>

        {/* New Ticket Form */}
        {showForm && (
          <form onSubmit={handleCreateTicket} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-6 md:p-8 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Support Ticket</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  labelStyle="wizard"
                  fieldSize="compact"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { label: "General", value: "general" },
                    { label: "Payment", value: "payment" },
                    { label: "Profile", value: "profile" },
                    { label: "Verification", value: "verification" },
                    { label: "Technical", value: "technical" },
                  ]}
                  placeholder={false}
                />
                <Select
                  label="Priority"
                  labelStyle="wizard"
                  fieldSize="compact"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                  ]}
                  placeholder={false}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50 resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" size="md" loading={submitting} className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Submit Ticket
              </Button>
              <Button type="button" variant="outline" size="md" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Ticket Detail View */}
        {selectedTicket ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                <span className="text-xs text-slate-400">Ticket #{selectedTicket.id}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                Back to List
              </Button>
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedTicket.messages?.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === "user"
                      ? "bg-maroon-500 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                  }`}>
                    <p className="leading-relaxed font-light">{msg.text}</p>
                    <span className="text-[9px] block text-right mt-1 opacity-60">
                      {msg.sender === "user" ? "You" : "Support"} · {new Date(msg.created_at || msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {!selectedTicket.messages?.length && (
                <p className="text-sm text-slate-400 text-center py-4">No messages yet.</p>
              )}
            </div>

            {/* Reply form */}
            <form onSubmit={handleReply} className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                placeholder="Type your reply..."
              />
              <Button type="submit" variant="primary" size="md" loading={replying} className="px-4">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        ) : (
          /* Ticket List */
          <div className="space-y-3">
            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-maroon-500 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Support Tickets</h3>
                <p className="text-sm font-light text-slate-500 dark:text-slate-400">
                  You haven't submitted any support tickets yet. Click "New Ticket" to get help.
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                      ticket.status === "open" ? "bg-amber-50 text-amber-600" :
                      ticket.status === "resolved" ? "bg-emerald-50 text-emerald-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {ticket.status === "resolved" ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{ticket.subject}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase">
                        <span>#{ticket.id}</span>
                        <span>·</span>
                        <span>{ticket.category}</span>
                        <span>·</span>
                        <span className={ticket.priority === "high" ? "text-red-500" : ""}>{ticket.priority}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
