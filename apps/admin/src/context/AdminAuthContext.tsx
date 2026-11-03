"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  adminApi,
} from "@/lib/admin-api-client";

export type AdminRole = "super_admin" | "moderator" | "support_agent";

export interface AdminSession {
  adminId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  email: string;
  token: string;
  expiresAt: number;
}

interface AdminAuthContextType {
  session: AdminSession | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (roles: AdminRole[]) => boolean;
  refreshSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const SESSION_KEY = "admin_session";
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/login";

  // Validate token on mount (and on route change for non-login pages)
  const validateSession = useCallback(async () => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const raw = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (!raw) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    try {
      const parsed: AdminSession = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        clearAdminToken();
        localStorage.removeItem(SESSION_KEY);
        setLoading(false);
        router.replace("/login");
        return;
      }
      setSession(parsed);

      // Validate token server-side (best-effort, non-blocking)
      const res = await adminApi.validateToken();
      if (!res.success) {
        clearAdminToken();
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setLoading(false);
        router.replace("/login");
        return;
      }
    } catch {
      clearAdminToken();
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Session expiry warning (5 minutes before expiry)
  useEffect(() => {
    if (!session) return;
    const msUntilWarning = session.expiresAt - Date.now() - 5 * 60 * 1000;
    if (msUntilWarning <= 0) return;

    const timer = setTimeout(() => {
      // Session expires in 5 minutes — could show a modal here
      console.warn("Admin session expiring soon.");
    }, msUntilWarning);

    return () => clearTimeout(timer);
  }, [session]);

  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const res = await adminApi.login(username.trim(), password);
      if (!res.success) {
        return { success: false, error: res.error || res.message || "Invalid credentials. Access denied." };
      }

      const admin = (res as any).admin;
      const token = (res as any).token;
      if (!admin || !token) {
        return { success: false, error: "Invalid server response." };
      }

      const newSession: AdminSession = {
        adminId: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        email: admin.email,
        token,
        expiresAt: Date.now() + SESSION_TTL,
      };

      setAdminToken(token);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    // Best-effort server logout
    adminApi.logout().catch(() => {});
    clearAdminToken();
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    router.replace("/login");
  }, [router]);

  const hasRole = useCallback(
    (roles: AdminRole[]): boolean => {
      if (!session) return false;
      return roles.includes(session.role);
    },
    [session]
  );

  const refreshSession = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  return (
    <AdminAuthContext.Provider
      value={{ session, loading, login, logout, hasRole, refreshSession }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
