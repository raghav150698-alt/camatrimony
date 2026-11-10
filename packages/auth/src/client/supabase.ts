import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const usesSupabaseAuth = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'supabase';
let client: SupabaseClient | null = null;
export function getSupabaseAuth(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Sign-in is temporarily unavailable. Please contact support.');
  client = createClient(url, key, {auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
