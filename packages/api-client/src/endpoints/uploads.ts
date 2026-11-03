import { getApiClient } from "../client";
import { getAuthToken } from "../auth";
import type { ApiResponse } from "@camatrimony/shared";

export async function uploadFile(
  file: File,
  type: "govt_id" | "degree" | "photos" | "payment_proof"
): Promise<ApiResponse<{ fileName: string; url: string; r2Key: string }>> {
  // Sensitive uploads require auth — fail fast with a clear message if the
  // session is missing (do not rely on the API 401 alone).
  // Prefer a fresh JWT for uploads, but don't fail if refresh is unavailable.
  let token = await getAuthToken({ forceRefresh: true });
  if (!token) {
    token = await getAuthToken();
  }
  if (!token) {
    return {
      success: false,
      error: "Please log in again to upload files.",
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  // Do NOT pass headers: {} here — that previously overwrote Authorization
  // after the client attached the Bearer token (see ApiClient.request).
  return getApiClient().post("/uploads", formData);
}

export async function deleteUpload(key: string): Promise<ApiResponse<any>> {
  return getApiClient().delete(`/uploads?key=${encodeURIComponent(key)}`);
}
