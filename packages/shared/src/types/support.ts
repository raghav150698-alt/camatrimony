export interface SupportTicket {
  id: number;
  user_id: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  messages?: string;
  assigned_to?: string | null;
  created_at: string;
}
