export interface MediationRequest {
  id: number;
  requester_id: string;
  target_user_id: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string;
  status: "pending" | "approved" | "declined" | "completed";
  admin_notes?: string | null;
  assigned_to?: string | null;
  created_at: string;
}
