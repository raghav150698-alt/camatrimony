import { getApiClient } from "../client";
import type { ApiResponse } from "@camatrimony/shared";

export async function getBlockedUsers(userId: string): Promise<ApiResponse<any[]>> {
  return getApiClient().get(`/block?userId=${userId}`);
}

export async function blockUser(userId: string, blockedUserId: string, reason?: string): Promise<ApiResponse<any>> {
  return getApiClient().post("/block", { blockedId: blockedUserId, reason });
}

export async function unblockUser(userId: string, blockedUserId: string): Promise<ApiResponse<any>> {
  return getApiClient().delete(`/block?blockedId=${encodeURIComponent(blockedUserId)}`);
}
