import { getApiClient } from "../client";
import type { MediationRequest, ApiResponse } from "@camatrimony/shared";

export async function getMediationRequests(userId: string): Promise<ApiResponse<MediationRequest[]>> {
  return getApiClient().get(`/mediation?userId=${userId}`);
}

export async function createMediationRequest(
  requesterId: string,
  targetUserId: string,
  preferredDate: string,
  preferredTime: string,
  notes?: string
): Promise<ApiResponse<MediationRequest>> {
  return getApiClient().post("/mediation", {
    requesterId,
    targetUserId,
    preferredDate,
    preferredTime,
    notes,
  });
}

export async function respondToMediation(
  mediationId: number,
  status: "approved" | "declined",
  adminNotes?: string
): Promise<ApiResponse<MediationRequest>> {
  return getApiClient().patch(`/mediation/${mediationId}`, { status, adminNotes });
}
