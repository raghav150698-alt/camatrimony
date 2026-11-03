"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth, type AdminRole } from "@/context/AdminAuthContext";
import AdminSidebar, { menuSections } from "./AdminSidebar";
import AdminGuard from "./AdminGuard";

/**
 * Resolve allowed roles for the current path from the sidebar menu matrix
 * so deep links are blocked the same way as hidden nav items.
 */
function rolesForPath(pathname: string): AdminRole[] | null {
  if (pathname === "/login") return null;

  if (pathname.startsWith("/users/")) {
    const usersItem = menuSections.flatMap((s) => s.items).find((i) => i.href === "/users");
    return usersItem?.roles ?? ["super_admin", "moderator", "support_agent"];
  }

  const items = menuSections.flatMap((s) => s.items);
  const match = items
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return match.roles;

  if (pathname === "/") {
    return ["super_admin", "moderator", "support_agent"];
  }

  // Unknown routes: fail closed
  return ["super_admin"];
}

/**
 * AdminLayout — the shared admin shell (sidebar + header + logout button).
 *
 * Wraps all admin pages EXCEPT /login. The login page renders without chrome.
 *
 * Wave 3: AdminGuard wraps page content using the same role matrix as the sidebar.
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { session, loading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  const isLoginPage = pathname === "/login";
  const allowedRoles = useMemo(() => rolesForPath(pathname), [pathname]);

  useEffect(() => {
    if (!session) return;
    const msUntilWarning = session.expiresAt - Date.now() - 5 * 60 * 1000;
    if (msUntilWarning <= 0) {
      setShowExpiryWarning(true);
      return;
    }
    const timer = setTimeout(() => setShowExpiryWarning(true), msUntilWarning);
    const expiryTimer = setTimeout(() => {
      logout();
    }, session.expiresAt - Date.now());
    return () => {
      clearTimeout(timer);
      clearTimeout(expiryTimer);
    };
  }, [session, logout]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 select-none">
        <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-bold text-slate-500">Initializing administrative workspace...</span>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const adminName = session.displayName || session.username || "Admin";
  const adminEmail = session.email || session.username;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans antialiased text-slate-800 dark:text-slate-200">
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        resolvedRole={session.role}
        adminName={adminName}
        adminEmail={adminEmail}
      />

      <div
        className={`flex-grow flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? "md:pl-64 lg:pl-64" : "md:pl-20 lg:pl-20"
        }`}
      >
        <header className="h-16 bg-white/70 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-6 sm:px-8 shadow-sm select-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Administrative Control Console
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {adminName}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-3 py-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {showExpiryWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Your admin session will expire soon. Please save your work and re-login to continue.
            </p>
            <button
              onClick={() => setShowExpiryWarning(false)}
              className="text-amber-600 hover:text-amber-800 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-grow p-6 sm:p-8 pb-12 sm:pb-16 bg-slate-50 dark:bg-slate-950/40">
          {allowedRoles ? <AdminGuard roles={allowedRoles}>{children}</AdminGuard> : children}
        </main>
      </div>
    </div>
  );
}
