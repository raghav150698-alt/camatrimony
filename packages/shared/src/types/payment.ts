export interface Package {
  id: number;
  name: string;
  price: number;
  validity_days: number;
  contact_limit: number;
  chat_allowed: number;
  is_active?: number;
  is_custom?: number;
  features?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  package_id: number;
  amount: number;
  status: string;
  order_id: string;
  created_at?: string;
}

export interface Subscription {
  isActive?: boolean;
  contactLimitBalance?: number;
  planName?: string;
  id: number;
  user_id: string;
  package_id: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_id?: string;
}
