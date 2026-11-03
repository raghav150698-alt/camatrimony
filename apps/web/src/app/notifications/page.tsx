"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  CheckCheck, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  MessageSquare, 
  Info,
  Clock,
  AlertCircle,
  ArrowRight,
  UserCheck
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@camatrimony/ui";
import { Badge } from "@camatrimony/ui";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import { Card, CardBody } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@camatrimony/api-client";

export default function NotificationsCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadNotifications = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await getNotifications(user.uid);
      if (res.success && res.data) {
        const notifs = res.data as any[];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.isRead && n.is_read === undefined).length || notifs.filter((n: any) => n.is_read === 0).length);
      }
    } catch (err) {
      console.error("Notifications fetch error", err);
      addToast("error", "Error", "Could not fetch notifications from the edge.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Mark single as read
  const handleMarkAsRead = async (notifId: number) => {
    setMarkingId(notifId);
    try {
      const res = await markNotificationRead(notifId);

      if (res.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: 1, isRead: 1 } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Mark read error", err);
    } finally {
      setMarkingId(null);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0 || unreadCount === 0) return;
    try {
      const res = await markAllNotificationsRead(user!.uid);

      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1, isRead: 1 })));
        setUnreadCount(0);
        addToast("success", "Notifications Log", "All in-app alerts marked as read.");
      }
    } catch (err) {
      addToast("error", "Error", "Failed to mark all as read.");
    }
  };

  // Navigate to corresponding routes upon click
  const handleNotificationClick = async (notif: any) => {
    if (notif.is_read === 0) {
      await handleMarkAsRead(notif.id);
    }

    if (notif.type === "interest") {
      router.push("/interests");
    } else if (notif.type === "message") {
      router.push(`/chat?id=${notif.reference_id}`);
    } else if (notif.type === "kyc") {
      router.push("/profile/edit");
    } else if (notif.type === "payment") {
      router.push("/plans");
    } else {
      router.push("/dashboard");
    }
  };

  // Protect client route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/notifications")}`);
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
            <p className="text-sm font-semibold text-slate-400">Loading your notification center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Type specific icon renderings
  const getIcon = (type: string) => {
    const iconStyles = "w-5 h-5 shrink-0";
    if (type === "interest") {
      return (
        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-100 dark:border-amber-900/50">
          <Sparkles className={iconStyles} />
        </div>
      );
    }
    if (type === "message") {
      return (
        <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 text-sky-500 border border-sky-100 dark:border-sky-900/50">
          <MessageSquare className={iconStyles} />
        </div>
      );
    }
    if (type === "kyc") {
      return (
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border border-emerald-200 dark:border-emerald-900/50">
          <ShieldCheck className={iconStyles} />
        </div>
      );
    }
    if (type === "payment") {
      return (
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-100 dark:border-rose-900/50">
          <CreditCard className={iconStyles} />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50 dark:border-slate-700">
        <Info className={iconStyles} />
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-8">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        {/* HERO ACCENT */}
        <PageHeader eyebrow="STAY IN THE LOOP" title="Your updates." description="Interests, messages and account news in one place.">{unreadCount > 0 && <button onClick={handleMarkAllAsRead} className="site-action site-action-outline">Mark all as read</button>}</PageHeader>

        {/* LIST LOG PANEL */}
        {fetching ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-semibold text-slate-400">Loading updates…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 max-w-lg mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">All Caught Up!</h4>
            <p className="text-sm font-light text-slate-500 leading-relaxed">
              You’re all caught up. New updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer ${
                  notif.is_read === 0 ? "border-l-4 border-l-maroon-500 bg-maroon-500/5" : ""
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <CardBody className="p-5 flex gap-4 items-start">
                  {getIcon(notif.type)}
                  
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        {notif.title}
                        {notif.is_read === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-maroon-500 inline-block animate-ping" />
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-light flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(notif.created_at).toLocaleDateString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-light text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                      {notif.body}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
