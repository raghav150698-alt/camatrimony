/**
 * Admin API Client
 *
 * Typed fetch wrapper for /v1/admin/* endpoints.
 * Auto-attaches the admin token from localStorage.
 */

import { toAbsoluteMediaUrl } from "@camatrimony/shared";

const ADMIN_TOKEN_KEY = "admin_token";

/**
 * Base URL for the admin API. Falls back to the production Workers API URL.
 * Never use api.camatrimonybncn.com (NXDOMAIN).
 */
export function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8787/v1";
  }
  return "https://camatrimony-api.gentle-mode-2ab9.workers.dev/v1";
}

/** Extract R2 object key from a stored media URL. */
export function extractMediaKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes("key=")) {
      const parsed = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, `${getBaseUrl()}/uploads`);
      const key = parsed.searchParams.get("key");
      return key ? decodeURIComponent(key) : null;
    }
  } catch {
    // fall through
  }

  if (!trimmed.startsWith("http") && trimmed.includes("/")) {
    return trimmed.replace(/^\/+/, "");
  }
  return null;
}

/** Absolute media URL for admin img/src (relative `/v1/...`, bare keys, or already-absolute). */
export function resolveMediaUrl(url: string | null | undefined): string {
  return toAbsoluteMediaUrl(url, getBaseUrl());
}

/**
 * Retrieve the admin token from localStorage (browser only).
 */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

/**
 * Persist the admin token to localStorage (browser only).
 */
export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

/**
 * Remove the admin token from localStorage (browser only).
 */
export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

export class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || getBaseUrl()).replace(/\/$/, "");
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    options?: RequestInit
  ): Promise<AdminApiResponse<T>> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };

    // Auto-attach admin token
    const token = getAdminToken();
    if (token) {
      headers["x-admin-token"] = token;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      ...options,
    };

    if (body !== undefined && body !== null) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, fetchOptions);

      // Handle 401 — token invalid/expired
      if (res.status === 401) {
        clearAdminToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return { success: false, error: "Unauthorized. Please log in again." };
      }

      const data = await res.json();
      return data as AdminApiResponse<T>;
    } catch (err) {
      console.error(`Admin API ${method} ${path} failed:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network request failed",
      };
    }
  }

  async get<T = any>(path: string, options?: RequestInit): Promise<AdminApiResponse<T>> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T = any>(path: string, body?: any, options?: RequestInit): Promise<AdminApiResponse<T>> {
    return this.request<T>("POST", path, body, options);
  }

  async patch<T = any>(path: string, body?: any, options?: RequestInit): Promise<AdminApiResponse<T>> {
    return this.request<T>("PATCH", path, body, options);
  }

  async delete<T = any>(path: string, options?: RequestInit): Promise<AdminApiResponse<T>> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}

// Default singleton instance
let defaultClient: AdminApiClient | null = null;

export function getAdminApiClient(): AdminApiClient {
  if (!defaultClient) {
    defaultClient = new AdminApiClient();
  }
  return defaultClient;
}

// Convenience helpers for common admin endpoints
export const adminApi = {
  client: getAdminApiClient(),

  // Auth
  login: (username: string, password: string) =>
    getAdminApiClient().post("/admin/auth", { username, password }),
  validateToken: () => getAdminApiClient().get("/admin/auth/validate"),
  logout: () => getAdminApiClient().post("/admin/auth/logout"),

  // Dashboard
  dashboard: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/dashboard${params ? `?${new URLSearchParams(params)}` : ""}`),

  // Users
  users: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/users${params ? `?${new URLSearchParams(params)}` : ""}`),
  user: (id: string) => getAdminApiClient().get(`/admin/users/${id}`),
  createUser: (data: any) => getAdminApiClient().post("/admin/users", data),
  updateUser: (id: string, data: any) => getAdminApiClient().patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => getAdminApiClient().delete(`/admin/users/${id}`),

  // KYC
  kyc: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/kyc${params ? `?${new URLSearchParams(params)}` : ""}`),
  approveKyc: (id: string) => getAdminApiClient().post(`/admin/kyc/${id}/approve`),
  approveKycDocument: (id: string, document: "govt_id" | "degree") =>
    getAdminApiClient().post(`/admin/kyc/${id}/approve-doc`, { document }),
  rejectKyc: (id: string, reason: string) =>
    getAdminApiClient().post(`/admin/kyc/${id}/reject`, { reason }),
  requestDocs: (id: string, message: string) =>
    getAdminApiClient().post(`/admin/kyc/${id}/request-docs`, { message }),
  bulkApproveKyc: (ids: string[]) => getAdminApiClient().post("/admin/kyc/bulk-approve", { ids }),
  bulkRejectKyc: (ids: string[], reason: string) =>
    getAdminApiClient().post("/admin/kyc/bulk-reject", { ids, reason }),

  // Subscriptions
  subscriptions: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/subscriptions${params ? `?${new URLSearchParams(params)}` : ""}`),
  assignSubscription: (data: any) => getAdminApiClient().post("/admin/subscriptions", data),
  uploadPaymentProof: async (userId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("type", "payment_proof");

    const url = `${getBaseUrl()}/admin/media`;
    const token = getAdminToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-admin-token"] = token;

    try {
      const res = await fetch(url, { method: "POST", headers, body: formData });
      if (res.status === 401) {
        clearAdminToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return { success: false, error: "Unauthorized. Please log in again." };
      }
      return (await res.json()) as AdminApiResponse<{ url: string; fileName?: string }>;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
      };
    }
  },
  updateSubscription: (data: any) => getAdminApiClient().patch("/admin/subscriptions", data),

  // Packages
  packages: () => getAdminApiClient().get("/admin/packages"),
  createPackage: (data: any) => getAdminApiClient().post("/admin/packages", data),
  updatePackage: (id: string, data: any) => getAdminApiClient().patch(`/admin/packages/${id}`, data),
  deletePackage: (id: string) => getAdminApiClient().delete(`/admin/packages/${id}`),

  // Payments
  payments: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/payments${params ? `?${new URLSearchParams(params)}` : ""}`),
  confirmPayment: (paymentId: string, data?: { activateUser?: boolean; notes?: string }) =>
    getAdminApiClient().post(`/admin/payments/${encodeURIComponent(paymentId)}/confirm`, data || {}),
  refundPayment: (paymentId: string, amount?: number, reason?: string) =>
    getAdminApiClient().post(`/admin/payments/${encodeURIComponent(paymentId)}/refund`, {
      ...(amount !== undefined ? { amount } : {}),
      ...(reason ? { reason } : {}),
    }),

  // Matches
  matches: (candidateId: string) => getAdminApiClient().get(`/admin/matches?candidateId=${candidateId}`),
  suggestMatch: (fromUserId: string, toUserId: string) =>
    getAdminApiClient().post("/admin/matches", { fromUserId, toUserId }),

  // Communication
  sendEmail: (data: any) => getAdminApiClient().post("/admin/email", data),

  // Moderation
  moderation: () => getAdminApiClient().get("/admin/moderation"),
  moderationAction: (data: any) => getAdminApiClient().post("/admin/moderation", data),

  // Mediation
  mediation: () => getAdminApiClient().get("/admin/mediation"),
  mediationAction: (data: any) => getAdminApiClient().post("/admin/mediation", data),

  // CMS
  cms: () => getAdminApiClient().get("/admin/cms"),
  cmsAction: (data: any) => getAdminApiClient().post("/admin/cms", data),

  // Audit
  audit: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/audit${params ? `?${new URLSearchParams(params)}` : ""}`),

  // Analytics
  analytics: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/analytics${params ? `?${new URLSearchParams(params)}` : ""}`),

  // Photos
  photos: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/photos${params ? `?${new URLSearchParams(params)}` : ""}`),
  approvePhoto: (id: string) => getAdminApiClient().post(`/admin/photos/${id}/approve`),
  rejectPhoto: (id: string, reason?: string) =>
    getAdminApiClient().post(`/admin/photos/${id}/reject`, { reason }),
  deletePhoto: (id: string) => getAdminApiClient().delete(`/admin/photos/${id}`),
  updatePhotoVisibility: (id: string, visibility: string, password?: string) =>
    getAdminApiClient().patch(`/admin/photos/${id}/visibility`, { visibility, password }),

  // Support (matches apps/api/src/routes/admin/support.ts)
  support: (params?: Record<string, string>) =>
    getAdminApiClient().get(`/admin/support${params ? `?${new URLSearchParams(params)}` : ""}`),
  updateSupportTicket: (ticketId: string, payload: {
    status?: string;
    assignedTo?: string;
    replyMessage?: string;
    adminNotes?: string;
    priority?: string;
  }) => getAdminApiClient().patch("/admin/support", { ticketId, ...payload }),

  // Settings / Roles
  roles: () => getAdminApiClient().get("/admin/roles"),
  rolesAction: (data: any) => getAdminApiClient().post("/admin/roles", data),
  settings: () => getAdminApiClient().get("/admin/settings"),
  updateSettings: (data: any) => getAdminApiClient().patch("/admin/settings", data),
  updateAdminProfile: (data: any) => getAdminApiClient().patch("/admin/profile", data),
};
