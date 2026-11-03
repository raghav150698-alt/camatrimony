"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import ProfileWizard from "@/components/registration/ProfileWizard";
import { resolvePostAuthPath } from "@/lib/auth-errors";
import { Button } from "@camatrimony/ui";

export default function OnboardingPage() {
  const { user, dbUser, loading } = useAuth();
  const router = useRouter();

  // Completed profiles should not re-enter the wizard
  useEffect(() => {
    if (!loading && user && dbUser?.isOnboardingCompleted) {
      router.replace(resolvePostAuthPath(true));
    }
  }, [user, dbUser, loading, router]);

  // If not loading and no user session, prompt login
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg
              className="animate-spin h-10 w-10 text-maroon-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading your secure session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center p-4 bg-radial from-maroon-50 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[36px] shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="p-4 rounded-full bg-maroon-50 dark:bg-maroon-950/20 text-maroon-500 animate-bounce">
              <Lock className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Access Restricted
              </h2>
              <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
                To create your matrimonial profile and enter the registration wizard, you must first verify your mobile or Google account session.
              </p>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="md"
              onClick={() => router.push("/login?next=/onboarding")}
              className="flex items-center justify-center gap-2"
            >
              Sign In to Continue <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800 w-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              100% Confidential Registration
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (dbUser?.isOnboardingCompleted) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <p className="text-sm font-semibold text-slate-400">Redirecting to dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-8 bg-radial from-maroon-50 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <ProfileWizard />
      </div>
    </Layout>
  );
}
