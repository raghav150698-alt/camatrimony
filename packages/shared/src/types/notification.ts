export interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: number;
  reference_id?: string | null;
  created_at: string;
}
