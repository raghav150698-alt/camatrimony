"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RotateCcw, LifeBuoy, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@camatrimony/ui";

function FailureContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Your payment could not be processed.";
  const rawPkg = (searchParams.get("package") || "").toLowerCase();
  const ID_TO_SLUG: Record<string, string> = { "1": "gold", "2": "diamond", "3": "platinum" };
  const VALID_SLUGS = new Set(["gold", "diamond", "platinum"]);
  const pkgSlug = VALID_SLUGS.has(rawPkg) ? rawPkg : ID_TO_SLUG[rawPkg] || null;
  const retryHref = pkgSlug ? `/checkout?package=${pkgSlug}` : "/plans";

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[36px] shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="w-12 h-12" />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payment Failed</h1>
            <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
              {error}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 text-left">
            <p className="text-xs font-light text-amber-700 dark:text-amber-400 leading-relaxed">
              Don't worry — no money has been deducted. You can try again with a different payment method. If the issue persists, please contact our support team.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link href={retryHref} className="block">
              <Button variant="primary" fullWidth size="md" className="flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            </Link>
            <Link href="/support" className="block">
              <Button variant="outline" fullWidth size="md" className="flex items-center justify-center gap-2">
                <LifeBuoy className="w-4 h-4" /> Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-maroon-500" /></div>}>
      <FailureContent />
    </Suspense>
  );
}
