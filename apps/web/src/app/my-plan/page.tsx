"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  CheckCircle,
  Calendar,
  Unlock,
  ArrowRight,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button, Toast, ToastMessage, ConfirmDialog } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import { getSubscription, getPackages, cancelSubscription } from "@camatrimony/api-client";
import { DEFAULT_PACKAGES } from "@camatrimony/shared";

export default function MyPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subscription, setSubscription] = useState<any>(null);
  const [pkg, setPkg] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!user) return;
    async function loadSubscription() {
      setFetching(true);
      try {
        const [res, packages] = await Promise.all([getSubscription(), getPackages()]);
        if (res.success && res.data) {
          const sub = res.data as any;
          setSubscription(sub);
          const source = Array.isArray(packages.data) && packages.data.length ? packages.data : DEFAULT_PACKAGES;
          const found = source.find(
            (p) => p.id === sub.packageId || p.name.toLowerCase() === sub.planName?.toLowerCase()
          );
          const selected = found || { name: sub.planName || "Membership", validity_days: sub.validity_days, contact_limit: sub.contact_limit, price: 0, features: [] };
          let featuresList: string[] = [];
          try { const raw = typeof selected.features === "string" ? JSON.parse(selected.features) : selected.features; featuresList = Array.isArray(raw) ? raw.filter((value: unknown) => typeof value === "string") : []; } catch { /* Invalid optional features do not hide the subscription. */ }
          setPkg({ ...selected, featuresList });
        }
      } catch (err) {
        console.error("Subscription fetch error:", err);
      } finally {
        setFetching(false);
      }
    }
    loadSubscription();
  }, [user]);

  const handleCancel = async () => {
    if (!user || !subscription) return;
    setCanceling(true);
    try {
      const res = await cancelSubscription();
      if (res.success) {
        setSubscription(null);
        addToast("success", "Subscription Cancelled", "Your subscription has been cancelled successfully.");
      } else {
        addToast("error", "Cancel Failed", res.error || "Failed to cancel subscription.");
      }
    } catch {
      addToast("error", "Cancel Failed", "Failed to cancel subscription.");
    } finally {
      setCanceling(false);
      setShowCancelConfirm(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?next=${encodeURIComponent("/my-plan")}`);
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon-500 animate-spin" />
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

      <div className="max-w-3xl mx-auto px-4 pb-8 space-y-6">
        <PageHeader eyebrow="MEMBERSHIP" title="Make room for a connection." description="Your current membership and contact credits."></PageHeader>

        {fetching ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-maroon-500 animate-spin" />
          </div>
        ) : subscription && pkg ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current Plan</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{pkg.name}</span>
                </div>
                <div className="bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-300 px-3 py-1 rounded-full text-xs font-bold border border-gold-300 dark:border-gold-700">
                  {subscription.isActive ? "Active" : "Expired"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Unlock className="w-5 h-5 text-gold-500" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Unlocks</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{pkg.contact_limit} total</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gold-500" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Validity</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{pkg.validity_days} days</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Features</span>
                {pkg.featuresList?.map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm font-light text-slate-600 dark:text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {subscription.renewalDate && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Renews on: {new Date(subscription.renewalDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link href="/plans" className="flex-1">
                  <Button variant="primary" fullWidth size="md" className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Upgrade Plan <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  loading={canceling}
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-2 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 text-center space-y-4">
            <Crown className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Subscription</h3>
            <p className="text-sm font-light text-slate-500 dark:text-slate-400">
              You don't have an active subscription. Upgrade to unlock contacts, chat, and premium features.
            </p>
            <Link href="/plans" className="inline-block">
              <Button variant="primary" size="md" className="flex items-center gap-2">
                View Plans <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will immediately lose access to premium features, and no refund will be provided for the remaining period. This cannot be undone."
        confirmText="Cancel Subscription"
        cancelText="Keep Plan"
        variant="danger"
      />
    </Layout>
  );
}
