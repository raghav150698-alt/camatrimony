import { getApiClient } from "../client";
import type { SupportTicket, ApiResponse } from "@camatrimony/shared";

export async function getSupportTickets(userId?: string): Promise<ApiResponse<SupportTicket[]>> {
  const params = userId ? `?userId=${userId}` : "";
  return getApiClient().get(`/support${params}`);
}

export async function createSupportTicket(
  userId: string,
  subject: string,
  category: string,
  priority: "low" | "medium" | "high",
  message: string
): Promise<ApiResponse<SupportTicket>> {
  return getApiClient().post("/support", { userId, subject, category, priority, message });
}

export async function replyToSupportTicket(
  ticketId: number,
  sender: "user" | "admin",
  text: string
): Promise<ApiResponse<SupportTicket>> {
  return getApiClient().post(`/support/${ticketId}/message`, { message: text });
}

export async function updateSupportTicket(
  ticketId: number,
  status: string,
  assignedTo?: string
): Promise<ApiResponse<SupportTicket>> {
  return getApiClient().patch(`/support/${ticketId}`, { status, assignedTo });
}
