import { getApiClient } from "../client";
import type { DBUserProfile, ApiResponse } from "@camatrimony/shared";

export async function getProfile(): Promise<ApiResponse<DBUserProfile>> {
  return getApiClient().get("/profile");
}

export async function updateProfile(
  data: Partial<DBUserProfile> & { email?: string | null; phone?: string | null }
): Promise<ApiResponse<DBUserProfile>> {
  return getApiClient().post("/profile", data);
}
