import { DEFAULT_API_BASE_URL } from "@camatrimony/shared";
import type { ApiResponse } from "@camatrimony/shared";
import { getAuthToken } from "./auth";

/**
 * Preferred primary payload keys for multi-key Hono responses.
 * When present, that value is copied to `data`; sibling keys (pagination,
 * unreadCount, etc.) remain on the response object for callers that need them.
 */
const PRIMARY_PAYLOAD_KEYS = [
  "profiles",
  "notifications",
  "payments",
  "packages",
  "favorites",
  "interests",
  "unlocks",
  "messages",
  "conversations",
  "tickets",
  "blockedUsers",
  "admins",
  "subscription",
  "profile",
  "payment",
  "reports",
  "mediationRequests",
  "photos",
  "auditLogs",
  "announcements",
  "subscriptions",
  "settings",
] as const;

/**
 * Normalizes API responses so callers can rely on `res.data`.
 * - Single named key (e.g. `{ favorites }`) → `data` = that value
 * - Known multi-key (e.g. `{ profiles, pagination }`) → `data` = primary array/object;
 *   siblings stay on the response (no circular `data = data`)
 * - Flat multi-key (e.g. `{ orderId, amount, currency }`) → `data` = shallow payload copy
 */
function normalizeResponse(data: any): any {
  if (!data || typeof data !== "object" || data.success === false || data.data !== undefined) {
    return data;
  }
  const metaKeys = ["success", "error", "message"];
  const keys = Object.keys(data).filter((k) => !metaKeys.includes(k));
  if (keys.length === 0) {
    return data;
  }
  if (keys.length === 1) {
    data.data = data[keys[0]];
    return data;
  }

  const primaryKey = PRIMARY_PAYLOAD_KEYS.find((k) => keys.includes(k));
  if (primaryKey) {
    data.data = data[primaryKey];
    return data;
  }

  // Flat payload (create-order, payment settings, etc.)
  const payload: Record<string, unknown> = {};
  for (const k of keys) {
    payload[k] = data[k];
  }
  data.data = payload;
  return data;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
      DEFAULT_API_BASE_URL;
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    if (process.env.NEXT_PUBLIC_CLIENT_PREVIEW === "true") {
      const { clientPreviewResponse } = await import("./client-preview");
      return normalizeResponse(await clientPreviewResponse(method, path, body)) as ApiResponse<T>;
    }
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    // Pull caller headers out so they merge into our header map — never let
    // `...options` overwrite Authorization after we attach the Firebase JWT.
    const { headers: optionHeaders, ...restOptions } = options || {};
    const baseHeaders: Record<string, string> = isFormData
      ? {}
      : { "Content-Type": "application/json" };

    const headers: Record<string, string> = {
      ...baseHeaders,
      ...((optionHeaders as Record<string, string>) || {}),
    };

    // Auto-attach Firebase JWT (must win over any caller Authorization)
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      ...restOptions,
      method,
      headers,
    };

    if (body !== undefined) {
      fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(url, fetchOptions);
      const bodyText = await res.text();
      let data: any;
      try { data = JSON.parse(bodyText); } catch {
        return { success: false, error: res.status === 401 ? "Please sign in again." : "The service is temporarily unavailable. Please try again." };
      }
      const normalized = normalizeResponse(data) as ApiResponse<T>;
      if (!res.ok) {
        normalized.success = false;
        if (res.status >= 500) normalized.error = "The service is temporarily unavailable. Please try again.";
        else if (res.status === 401) normalized.error = "Please sign in again.";
      }
      // Surface session expiry clearly when the API returns 401 without a message
      if (!normalized.success && res.status === 401 && !normalized.error) {
        normalized.error = "Please log in again";
      }
      return normalized;
    } catch (err) {
      console.error(`API ${method} ${path} failed:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network request failed",
      };
    }
  }

  async get<T = any>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T = any>(path: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body, options);
  }

  async patch<T = any>(path: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", path, body, options);
  }

  async delete<T = any>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}

// Default singleton instance
let defaultClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!defaultClient) {
    defaultClient = new ApiClient();
  }
  return defaultClient;
}
