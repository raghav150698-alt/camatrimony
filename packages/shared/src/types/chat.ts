export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  text: string;
  sent_at: string;
  is_read?: number;
}
