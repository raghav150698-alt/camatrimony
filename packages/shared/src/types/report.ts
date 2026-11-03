export interface Report {
  id: number;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details?: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  severity?: "low" | "medium" | "high";
  admin_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}
