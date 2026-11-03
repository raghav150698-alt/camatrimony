export interface InterestRequest {
  id: number;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  created_at: string;
  responded_at?: string | null;
}
