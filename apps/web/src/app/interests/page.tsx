"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Send, 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Phone,
  Unlock,
  Trash2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@camatrimony/ui";
import { Badge } from "@camatrimony/ui";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import { Tabs } from "@camatrimony/ui";
import { Card, CardBody } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getInterests,
  respondToInterest,
  getApiClient,
} from "@camatrimony/api-client";

export default function InterestsInboxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core state
  const [activeTab, setActiveTab] = useState("received"); // 'received', 'sent', 'accepted'
  const [interests, setInterests] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchInterests = async (tabName: string) => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await getInterests(user.uid, "all");
      if (res.success && res.data) {
        const all = res.data as any[];
        // Filter by direction
        let validInterests = all;
        if (tabName === "received") {
          validInterests = all.filter((i: any) => (i.receiverId || i.receiver_id) === user.uid);
        } else if (tabName === "sent") {
          validInterests = all.filter((i: any) => (i.senderId || i.sender_id) === user.uid);
        }

        if (tabName === "accepted") {
          const accepted = validInterests.filter((i: any) => i.status === "accepted");
          setInterests(accepted);
        } else if (tabName === "received") {
          const pendingReceived = validInterests.filter((i: any) => i.status === "pending" || i.status === "declined");
          setInterests(pendingReceived);
        } else {
          setInterests(validInterests);
        }
      }
    } catch (err) {
      addToast("error", "Error", "Could not synchronize interests from the edge server.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInterests(activeTab);
    }
  }, [user, activeTab]);

  // Respond to matching request (Accept / Decline)
  const handleRespondInterest = async (interestId: number, status: "accepted" | "declined") => {
    setRespondingId(interestId);
    try {
      const res = await respondToInterest(interestId, status);

      if (res.success) {
        setInterests(prev => prev.filter(i => i.id !== interestId));
        addToast(
          status === "accepted" ? "success" : "warning",
          status === "accepted" ? "Match Accepted!" : "Match Request Declined",
          status === "accepted" ? "You can now view their numbers and chat!" : "Candidate notified."
        );
      } else {
        addToast("error", "Failed", res.error || "Could not respond to match interest.");
      }
    } catch (err) {
      addToast("error", "Error", "Failed to update match status.");
    } finally {
      setRespondingId(null);
    }
  };

  // Withdraw sent interest
  const handleWithdrawInterest = async (interestId: number) => {
    setRespondingId(interestId);
    try {
      const res = await getApiClient().delete(`/interests/${interestId}`);

      if (res.success) {
        setInterests(prev => prev.filter(i => i.id !== interestId));
        addToast("success", "Interest Withdrawn", "Match request cancelled successfully.");
      } else {
        addToast("error", "Failed", res.error || "Failed to withdraw interest.");
      }
    } catch (err) {
      addToast("error", "Error", "Failed to retract interest.");
    } finally {
      setRespondingId(null);
    }
  };

  // Protect client route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/interests")}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading your interests inbox...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const tabOptions = [
    { id: "received", label: "Received Interests" },
    { id: "sent", label: "Sent Interests" },
    { id: "accepted", label: "Mutually Matched 🎉" },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        {/* HERO HEADER */}
        <PageHeader eyebrow="A CONNECTION STARTS HERE" title="A little interest. A possibility." description="See who’s reached out, and keep track of your introductions."></PageHeader>

        {/* TABS CONTAINER */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold border border-slate-200/50 dark:border-slate-700 max-w-2xl">
          {tabOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveTab(opt.id)}
              className={`flex-1 py-2.5 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === opt.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* DETAILS LISTING DECK */}
        {fetching ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-semibold text-slate-400">Loading interests…</span>
          </div>
        ) : interests.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 max-w-lg mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No interests yet</h4>
            <p className="text-sm font-light text-slate-500 leading-relaxed max-w-md mx-auto">
              Discover a profile you like and send an interest.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-xs"
            >
              Discover matches
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {interests.map((item) => {
              const targetUser = activeTab === "received" ? item.sender_id : item.receiver_id;
              const photosList = item.photos || [];
              const hasPhoto = photosList.length > 0;
              const isAccepted = item.status === "accepted";
              
              const photoSrc = isAccepted 
                ? (hasPhoto ? photosList[0] : "/avatar-placeholder.svg") 
                : "/avatar-placeholder.svg";

              return (
                <Card 
                  key={item.id}
                  className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative"
                >
                  <CardBody className="p-6 flex gap-5 items-start">
                    
                    {/* Blurred locks photo space */}
                    <div 
                      onClick={() => router.push(`/profile?id=${targetUser}`)}
                      className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 relative border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <img src={photoSrc} className={`w-full h-full object-cover ${!isAccepted ? "blur-sm" : ""}`} alt="" />
                      {!isAccepted && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                          <Lock className="w-4 h-4 text-gold-500" />
                        </div>
                      )}
                    </div>

                    {/* Meta info columns */}
                    <div className="flex-grow space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 
                            onClick={() => router.push(`/profile?id=${targetUser}`)}
                            className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight hover:text-maroon-500 cursor-pointer"
                          >
                            {isAccepted ? item.occupation?.split(',')[0] : `Verified ${item.highest_degree?.split(" ")[0]} Candidate`}
                          </h4>
                          <Badge variant="gold" className="text-[8px] uppercase py-0.5 px-1.5 font-extrabold">
                            {item.highest_degree}
                          </Badge>
                        </div>
                        <span className="text-[9px] text-slate-400 font-light block mt-0.5">
                          Age: {item.age} Yrs • Height: {item.height} • Caste: {item.caste}
                        </span>
                      </div>

                      {/* Custom Greeting Message */}
                      {item.message && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 text-[11px] font-light text-slate-500 dark:text-slate-400 italic">
                          "{item.message}"
                        </div>
                      )}

                      {/* Mutual Match credentials unlock */}
                      {isAccepted && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl space-y-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Phone: {item.phone || "View full profile for contact"}</span>
                          </div>
                          <div className="flex items-center gap-2 break-all">
                            <Mail className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Email: {item.email || "View full profile for email"}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 justify-end">
                        {activeTab === "received" && item.status === "pending" && (
                          <>
                            <button
                              disabled={respondingId !== null}
                              onClick={() => handleRespondInterest(item.id, "declined")}
                              className="py-1.5 px-3 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                            <Button
                              disabled={respondingId !== null}
                              onClick={() => handleRespondInterest(item.id, "accepted")}
                              size="sm"
                              className="text-[10px] font-bold py-1.5 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept Match
                            </Button>
                          </>
                        )}

                        {activeTab === "sent" && item.status === "pending" && (
                          <button
                            disabled={respondingId !== null}
                            onClick={() => handleWithdrawInterest(item.id)}
                            className="py-1.5 px-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-center text-[10px] font-bold border border-transparent flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Withdraw Request
                          </button>
                        )}

                        {isAccepted && (
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onClick={() => router.push(`/chat?id=${targetUser}`)}
                              className="text-[10px] font-bold py-1.5 flex items-center justify-center gap-1 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Open Chat Room
                            </Button>
                            <Button
                              variant="gold"
                              size="sm"
                              fullWidth
                              onClick={() => router.push(`/profile?id=${targetUser}`)}
                              className="text-[10px] font-bold py-1.5 flex items-center justify-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Full Profile
                            </Button>
                          </div>
                        )}
                      </div>

                    </div>

                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </Layout>
  );
}
