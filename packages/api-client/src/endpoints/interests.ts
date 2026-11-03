import { getApiClient } from "../client";
import type { InterestRequest, ApiResponse } from "@camatrimony/shared";

export type InterestDirection = "sent" | "received" | "all";

export async function getInterests(
  _userId?: string,
  direction: InterestDirection = "all"
): Promise<ApiResponse<InterestRequest[]>> {
  return getApiClient().get(`/interests?direction=${encodeURIComponent(direction)}`);
}

export async function sendInterest(
  senderId: string,
  receiverId: string,
  message?: string
): Promise<ApiResponse<InterestRequest>> {
  return getApiClient().post("/interests", { senderId, receiverId, message });
}

export async function respondToInterest(
  interestId: number,
  status: "accepted" | "declined"
): Promise<ApiResponse<InterestRequest>> {
  return getApiClient().patch(`/interests/${interestId}`, { status });
}
