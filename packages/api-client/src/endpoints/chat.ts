import { getApiClient } from "../client";
import type { Message, ApiResponse } from "@camatrimony/shared";

export async function getMessages(userId: string, otherUserId: string): Promise<ApiResponse<Message[]>> {
  return getApiClient().get(`/chat?senderId=${encodeURIComponent(userId)}&recipientId=${encodeURIComponent(otherUserId)}`);
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string
): Promise<ApiResponse<Message>> {
  return getApiClient().post("/chat", { recipientId: receiverId, content: text });
}

export interface ConversationSummary {
  userId: string;
  userEmail?: string;
  gender?: string;
  highestDegree?: string;
  occupation?: string;
  isVerified?: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount?: number;
}

export async function getConversations(): Promise<ApiResponse<ConversationSummary[]>> {
  return getApiClient().get("/chat/conversations");
}
