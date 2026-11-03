"use client";

import React from "react";
import { useAdminAuth, type AdminRole } from "@/context/AdminAuthContext";

/**
 * RBAC guard wrapper. Renders children only if the current admin has one of
 * the allowed roles. Otherwise shows a "no access" message.
 */
export default function AdminGuard({
  roles,
  children,
}: {
  roles: AdminRole[];
  children: React.ReactNode;
}) {
  const { session, hasRole } = useAdminAuth();

  if (!session) {
    return null;
  }

  if (!hasRole(roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 select-none">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Restricted</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm text-center">
          Your role ({session.role.replace("_", " ")}) does not have permission to view this section.
          Please contact a Super Admin if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
