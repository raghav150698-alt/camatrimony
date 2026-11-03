import { getApiClient } from "../client";
import type { ApiResponse } from "@camatrimony/shared";

export async function getUnlocks(userId: string): Promise<ApiResponse<any[]>> {
  return getApiClient().get(`/unlocks?userId=${userId}`);
}

export async function unlockContact(userId: string, unlockedUserId: string): Promise<ApiResponse<any>> {
  return getApiClient().post("/unlocks", { targetUserId: unlockedUserId });
}
