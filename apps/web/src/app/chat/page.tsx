"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  MoreVertical,
  Flag,
  CheckCircle2,
  Sparkles,
  Search,
  MessageSquare,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button, Toast, ToastMessage, Textarea } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getMessages,
  sendMessage,
  getInterests,
  getConversations,
  getProfileByUserId,
  createReport,
} from "@camatrimony/api-client";

interface ChatMessage {
  id: number;
  senderId: string;
  receiverId?: string;
  recipientId?: string;
  text?: string;
  content?: string;
  sentAt?: string;
  created_at?: string;
}

interface ChatChannel {
  userId: string;
  name: string;
  highestDegree: string;
  occupation: string;
  online: boolean;
  avatar: string;
  initials: string;
  photos: string[];
}

function ChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id") || "";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showMobileConversation, setShowMobileConversation] = useState(false);
  useEffect(() => { if (targetId) setShowMobileConversation(true); }, [targetId]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleReport = async () => {
    if (!user || !activeChannel || !reportReason.trim()) return;
    setReportLoading(true);
    try {
      const res = await createReport(user.uid, activeChannel.userId, reportReason.trim());
      if (res.success) {
        addToast("success", "Report Submitted", "Our team will review it.");
        setReportingUserId(null);
        setReportReason("");
      } else {
        addToast("error", "Report Failed", res.error || "Failed to submit report.");
      }
    } catch {
      addToast("error", "Report Failed", "Failed to submit report.");
    } finally {
      setReportLoading(false);
    }
  };

  // Route security guard
  useEffect(() => {
    if (!loading && !user) {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      router.push(`/login?next=${encodeURIComponent(`/chat${qs}`)}`);
    }
  }, [user, loading, router]);

  // Build conversation list from accepted interests (both directions) + chat/conversations
  const fetchChannels = useCallback(async () => {
    if (!user) return;
    setLoadingChannels(true);
    try {
      const conversationPartners = new Set<string>();
      const partnerMeta = new Map<string, Partial<ChatChannel>>();

      const [intRes, convRes] = await Promise.all([
        getInterests(user.uid, "all"),
        getConversations().catch(() => ({ success: false as const, data: null })),
      ]);

      if (intRes.success && intRes.data) {
        const all = intRes.data as any[];
        all.forEach((i: any) => {
          if (i.status === "accepted") {
            const otherId =
              (i.senderId || i.sender_id) === user.uid
                ? i.receiverId || i.receiver_id
                : i.senderId || i.sender_id;
            if (otherId) conversationPartners.add(otherId);
          }
        });
      }

      if (convRes.success && convRes.data) {
        (convRes.data as any[]).forEach((c: any) => {
          if (c.userId) {
            conversationPartners.add(c.userId);
            partnerMeta.set(c.userId, {
              highestDegree: c.highestDegree || "",
              occupation: c.occupation || "",
              name: c.occupation?.split(",")[0] || "CA Member",
            });
          }
        });
      }

      // If ?id= is provided, include that user as a conversation partner
      if (targetId) {
        conversationPartners.add(targetId);
      }

      // Fetch profile info for each conversation partner
      const channelList: ChatChannel[] = [];
      for (const partnerId of Array.from(conversationPartners)) {
        const meta = partnerMeta.get(partnerId);
        try {
          const profRes = await getProfileByUserId(partnerId);
          if (profRes.success && profRes.data) {
            const p = profRes.data as any;
            const name = p.occupation?.split(",")[0] || meta?.name || "CA Member";
            channelList.push({
              userId: partnerId,
              name,
              highestDegree: p.highestDegree || meta?.highestDegree || "Professional",
              occupation: p.occupation || meta?.occupation || "",
              online: false,
              avatar: p.photos?.[0] || "/success_story_1.png",
              initials: name.substring(0, 2).toUpperCase(),
              photos: p.photos || [],
            });
          } else {
            channelList.push({
              userId: partnerId,
              name: meta?.name || "Match",
              highestDegree: meta?.highestDegree || "",
              occupation: meta?.occupation || "",
              online: false,
              avatar: "/success_story_1.png",
              initials: "CA",
              photos: [],
            });
          }
        } catch {
          // skip failed profile fetch
        }
      }

      setChannels(channelList);

      // Auto-select channel: ?id= param first, else first available
      if (targetId) {
        const found = channelList.find((c) => c.userId === targetId);
        if (found) {
          setActiveChannel(found);
        } else if (channelList.length > 0) {
          setActiveChannel(channelList[0]);
        }
      } else if (channelList.length > 0 && !activeChannel) {
        setActiveChannel(channelList[0]);
      }
    } catch (err) {
      console.error("Failed to fetch chat channels:", err);
    } finally {
      setLoadingChannels(false);
    }
  }, [user, targetId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Fetch messages for active channel + poll every 5 seconds
  const fetchMessages = useCallback(async () => {
    if (!user || !activeChannel) return;
    try {
      const res = await getMessages(user.uid, activeChannel.userId);
      if (res.success && res.data) {
        setMessages(
          (res.data as any[]).map((m: any) => ({
            id: m.id,
            senderId: m.sender_id || m.senderId,
            receiverId: m.receiver_id || m.recipientId || m.receiverId,
            recipientId: m.recipient_id || m.recipientId,
            text: m.text || m.content,
            content: m.content,
            sentAt: m.sent_at || m.sentAt,
            created_at: m.created_at,
          })) as ChatMessage[]
        );
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [user, activeChannel]);

  useEffect(() => {
    fetchMessages();
    if (!user || !activeChannel) return;
    const intervalId = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalId);
  }, [fetchMessages, user, activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !user || !activeChannel) return;
    setSending(true);

    const text = typedMessage;
    setTypedMessage("");

    // Optimistic append
    const optimistic: ChatMessage = {
      id: Date.now(),
      senderId: user.uid,
      receiverId: activeChannel.userId,
      content: text,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage(user.uid, activeChannel.userId, text);
      // Refetch to get the real server-side message
      fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // Filter channels by search
  const filteredChannels = channels.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.occupation.toLowerCase().includes(q) ||
      c.highestDegree.toLowerCase().includes(q)
    );
  });

  if (loading || !user) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading conversations…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 h-[calc(100dvh-210px)] md:h-[calc(100dvh-15rem)]">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl h-full grid grid-cols-1 md:grid-cols-12">

          {/* LEFT CHANNEL SIDEBAR PANEL (4 Columns) */}
          <aside className={`${showMobileConversation ? "hidden md:flex" : "flex"} md:col-span-4 border-r border-slate-100 flex-col h-full min-h-0 bg-slate-50/50`}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" /> Conversations
              </h2>
              <p className="text-xs text-slate-400 font-light mt-1">
                A little space to get to know each other.
              </p>

              {/* Search filter */}
              {channels.length > 0 && (
                <div className="relative mt-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder="Search conversations..."
                  />
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>

            {/* Channels listing */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingChannels ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                        <div className="flex-grow space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-400">
                    {channels.length === 0
                      ? "No conversations yet"
                      : "No matches found"}
                  </p>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    {channels.length === 0
                      ? "Express interest in profiles and once accepted, you can chat here."
                      : "Try a different search term."}
                  </p>
                </div>
              ) : (
                filteredChannels.map((chan) => (
                  <button
                    key={chan.userId}
                    onClick={() => { setActiveChannel(chan); setShowMobileConversation(true); }}
                    className={`w-full text-left p-4 rounded-3xl border transition-all duration-300 flex items-center gap-4 cursor-pointer relative group ${
                      activeChannel?.userId === chan.userId
                        ? "bg-maroon-500 border-transparent text-white shadow-lg shadow-maroon-500/25"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-gold-500 bg-slate-200 flex-shrink-0">
                      <Image src={chan.avatar} alt={chan.name} fill sizes="48px" className="object-cover" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-extrabold text-sm truncate">{chan.name}</span>
                      </div>
                      <p className={`text-[10px] font-light truncate ${activeChannel?.userId === chan.userId ? "text-maroon-100" : "text-slate-400"}`}>
                        {chan.occupation}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* CENTER MESSAGING WORKSPACE PANEL (5 Columns) */}
          <section className={`${showMobileConversation ? "flex" : "hidden md:flex"} md:col-span-8 xl:col-span-5 flex-col h-full min-h-0`}>
            <button className="flex min-h-11 items-center gap-2 border-b border-slate-100 px-5 text-xs text-maroon-500 md:hidden" onClick={() => setShowMobileConversation(false)}><ArrowLeft size={16} />All conversations</button>
            {activeChannel ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gold-500">
                      <Image src={activeChannel.avatar} alt={activeChannel.name} fill sizes="40px" className="object-cover" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">{activeChannel.name}</span>
                      <span className="text-[10px] text-slate-400 font-light block -mt-0.5">
                        {activeChannel.highestDegree}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages scroll content area */}
                <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">

                  <div className="text-center my-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-[10px] text-emerald-600 font-bold uppercase tracking-wider border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Encrypted Chat
                    </span>
                  </div>

                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
                      <MessageSquare className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-light text-slate-400">
                        No messages yet. Say hello to {activeChannel.name}!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn = msg.senderId === user.uid;
                      const content = msg.content || msg.text || "";
                      const time = msg.sentAt || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
                      return (
                        <div key={msg.id || idx} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                            isOwn
                              ? "bg-maroon-500 text-white rounded-br-none"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700"
                          }`}>
                            <p className="leading-relaxed font-light">{content}</p>
                            <span className={`text-[9px] block text-right mt-1.5 font-medium ${isOwn ? "text-maroon-100" : "text-slate-400"}`}>
                              {time}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message input bar */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                  <input
                    type="text"
                    required
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder={`Reply to ${activeChannel.name}...`}
                  />
                  <Button type="submit" variant="primary" size="md" loading={sending} className="p-2 rounded-xl flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <MessageSquare className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-400">
                  {loadingChannels ? "Loading conversations..." : "Choose a conversation to start chatting."}
                </p>
              </div>
            )}
          </section>

          {/* RIGHT SIDEBAR MATCH PREVIEW INFO (3 Columns) */}
          <aside className="hidden xl:flex md:col-span-3 border-l border-slate-100 dark:border-slate-800 p-6 flex-col items-center justify-between h-full bg-white dark:bg-slate-900 text-center overflow-y-auto">
            {activeChannel ? (
              <>
                <div className="space-y-6 w-full">
                  <div className="relative w-24 h-24 rounded-3xl overflow-hidden border-2 border-gold-500 mx-auto shadow-md">
                    <Image src={activeChannel.avatar} alt={activeChannel.name} fill sizes="96px" className="object-cover" />
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      {activeChannel.name}
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </h3>
                    <span className="text-xs font-bold text-gold-600 block mt-0.5 uppercase tracking-wider">
                      {activeChannel.highestDegree}
                    </span>
                    <span className="text-xs text-slate-400 block mt-1 font-light leading-normal">
                      {activeChannel.occupation}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  {!reportingUserId ? (
                    <Button
                      variant="outline"
                      fullWidth
                      size="sm"
                      onClick={() => {
                        setReportingUserId(activeChannel.userId);
                        setReportReason("");
                      }}
                      className="flex items-center justify-center gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50"
                    >
                      <Flag className="w-3.5 h-3.5" /> Report User
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Please describe the reason for reporting this user..."
                        className="text-xs"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          loading={reportLoading}
                          onClick={handleReport}
                          className="bg-rose-600 hover:bg-rose-700 border-transparent"
                        >
                          Submit Report
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setReportingUserId(null); setReportReason(""); }}
                          disabled={reportLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs font-light text-slate-400">No conversation selected</p>
              </div>
            )}
          </aside>

        </div>
      </div>
    </Layout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
