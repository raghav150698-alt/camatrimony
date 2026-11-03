"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, MessageSquare, Search, Sparkles, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@camatrimony/ui";

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") || "";

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[36px] shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-500" /> Payment Successful!
            </h1>
            <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
              Your premium subscription has been activated. You can now unlock contacts, chat with matches, and enjoy all premium features. A confirmation receipt has been sent to your registered email address.
            </p>
          </div>

          {paymentId && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Reference ID</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white break-all">{paymentId}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">What's Next?</h3>
            <Link href="/dashboard" className="block">
              <Button variant="primary" fullWidth size="md" className="flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> Browse Matches <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/chat" className="block">
              <Button variant="outline" fullWidth size="md" className="flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" /> Start Chatting
              </Button>
            </Link>
            <Link href="/my-plan" className="block">
              <Button variant="ghost" fullWidth size="sm">
                View My Subscription
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-maroon-500" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
