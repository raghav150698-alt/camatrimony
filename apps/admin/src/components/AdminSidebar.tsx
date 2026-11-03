"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth, type AdminRole } from "@/context/AdminAuthContext";

export interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles: AdminRole[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const menuSections: MenuSection[] = [
  {
    title: "Main Controls",
    items: [
      {
        name: "Dashboard Overview",
        href: "/",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "Users Catalog",
        href: "/users",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "KYC Verification",
        href: "/kyc",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        roles: ["super_admin", "moderator"],
      },
      {
        name: "Photo Moderation",
        href: "/photos",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        roles: ["super_admin", "moderator"],
      },
    ],
  },
  {
    title: "Business Center",
    items: [
      {
        name: "Subscription Plans",
        href: "/subscriptions",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "Package Catalog",
        href: "/packages",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        roles: ["super_admin"],
      },
      {
        name: "Payments & Revenue",
        href: "/payments",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "Matches & Compatibility",
        href: "/matches",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
    ],
  },
  {
    title: "Engagement & Mediation",
    items: [
      {
        name: "Communications Hub",
        href: "/communication",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        roles: ["super_admin", "moderator"],
      },
      {
        name: "Safety & Moderation",
        href: "/moderation",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "Mediation Board",
        href: "/mediation",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        roles: ["super_admin", "moderator", "support_agent"],
      },
      {
        name: "Support Tickets",
        href: "/support",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.834 2.829a9 9 0 00-2.167-9.238m-1.414 5.658a4.978 4.978 0 00-1.414 2.83" />
          </svg>
        ),
        roles: ["super_admin", "support_agent"],
      },
    ],
  },
  {
    title: "Portal System",
    items: [
      {
        name: "Branding & CMS",
        href: "/cms",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        roles: ["super_admin"],
      },
      {
        name: "Reports & Exports",
        href: "/analytics",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ["super_admin", "moderator"],
      },
      {
        name: "Audit Trails",
        href: "/audit",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ["super_admin", "moderator"],
      },
      {
        name: "System Settings",
        href: "/settings",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ["super_admin"],
      },
    ],
  },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support_agent: "Support Agent",
};

const roleColors: Record<string, "danger" | "warning" | "info"> = {
  super_admin: "danger",
  moderator: "warning",
  support_agent: "info",
};

export default function AdminSidebar({
  sidebarOpen,
  setSidebarOpen,
  resolvedRole,
  adminName,
  adminEmail,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  resolvedRole: AdminRole;
  adminName: string;
  adminEmail: string;
}) {
  const pathname = usePathname();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 transform select-none ${
          sidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full md:translate-x-0 lg:translate-x-0 lg:w-20"
        }`}
      >
      {/* Sidebar Header Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maroon-500 to-maroon-700 flex items-center justify-center text-white font-bold flex-shrink-0">
            CA
          </div>
          {sidebarOpen && (
            <span className="font-extrabold text-sm tracking-wider text-maroon-700 dark:text-maroon-400 uppercase">
              Matrimony Admin
            </span>
          )}
        </div>
      </div>

      {/* Navigation scrollbar list */}
      <nav className="flex-grow overflow-y-auto px-4 py-4 space-y-7 scrollbar-none">
        {menuSections.map((sec, sIdx) => {
          // Filter menu items by role access
          const filteredItems = sec.items.filter((item) => item.roles.includes(resolvedRole));
          if (filteredItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-2">
              {sidebarOpen ? (
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3">
                  {sec.title}
                </h5>
              ) : (
                <div className="border-t border-slate-100 dark:border-slate-800/80 my-2 mx-1" />
              )}

              <div className="space-y-1">
                {filteredItems.map((item, iIdx) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      title={!sidebarOpen ? item.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative cursor-pointer group ${
                        isActive
                          ? "bg-maroon-50 dark:bg-maroon-950/20 text-maroon-600 dark:text-maroon-400 shadow-sm border-[1px] border-maroon-100/40 dark:border-maroon-900/10"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-[1px] border-transparent"
                      }`}
                    >
                      <span className="flex-shrink-0 text-current">{item.icon}</span>
                      {sidebarOpen && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer Account Section */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-maroon-500 to-maroon-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(adminName || "A").substring(0, 2).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {adminEmail || adminName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  roleColors[resolvedRole] === "danger"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : roleColors[resolvedRole] === "warning"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                }`}>
                  {roleLabels[resolvedRole] || resolvedRole}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
