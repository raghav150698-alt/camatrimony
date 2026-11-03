import { getApiClient } from "../client";
import type { Notification, ApiResponse } from "@camatrimony/shared";

export async function getNotifications(userId: string): Promise<ApiResponse<Notification[]>> {
  return getApiClient().get(`/notifications?userId=${encodeURIComponent(userId)}`);
}

export async function markNotificationRead(notificationId: number): Promise<ApiResponse<Notification>> {
  return getApiClient().patch("/notifications", { notificationId });
}

export async function markAllNotificationsRead(userId: string): Promise<ApiResponse<any>> {
  return getApiClient().patch("/notifications", { markAll: true });
}
