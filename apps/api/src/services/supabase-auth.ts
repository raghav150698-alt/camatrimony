import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

export interface SupabaseIdentity {
  id: string;
  email?: string;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  is_anonymous?: boolean;
}

/** Always validate against the configured auth server; never trust decoded JWT metadata. */
export async function verifySupabaseIdentity(token: string, env: Env): Promise<SupabaseIdentity | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new HTTPException(503,{message:'Sign-in is temporarily unavailable.'});
  const base = new URL(env.SUPABASE_URL);
  if (base.protocol !== 'https:') throw new HTTPException(503,{message:'Sign-in is temporarily unavailable.'});
  let response: Response;
  try {
    response = await fetch(`${base.origin}/auth/v1/user`, {
      headers:{Authorization:`Bearer ${token}`,apikey:env.SUPABASE_PUBLISHABLE_KEY},
      signal:AbortSignal.timeout(8000),redirect:'error',
    });
  } catch {
    throw new HTTPException(503,{message:'Sign-in is temporarily unavailable. Please try again.'});
  }
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new HTTPException(503,{message:'Sign-in is temporarily unavailable.'});
  const identity = await response.json() as SupabaseIdentity;
  if (!identity.id || identity.is_anonymous || (!identity.email_confirmed_at && !identity.phone_confirmed_at)) return null;
  return identity;
}

/** Existing account links are imported from verified auth exports, never user metadata or editable contact fields. */
export async function resolveMemberIdentity(identity: SupabaseIdentity, db: D1Database): Promise<string> {
  const linked = await db.prepare(`SELECT user_id FROM auth_identities WHERE provider = 'supabase' AND subject = ?`)
    .bind(identity.id).first<{user_id:string}>();
  if (linked) return linked.user_id;
  const email = identity.email_confirmed_at ? identity.email || null : null;
  const digits=identity.phone?.replace(/\D/g,'');
  const phone = identity.phone_confirmed_at && digits ? `+${digits}` : null;
  const legacy = await db.prepare(`SELECT id FROM users WHERE (email IS NOT NULL AND lower(email) = lower(?)) OR (phone IS NOT NULL AND replace(replace(replace(phone,'+',''),' ',''),'-','') = ?) LIMIT 1`)
    .bind(email,phone ? digits : null).first<{id:string}>();
  if (legacy && legacy.id !== identity.id) {
    throw new HTTPException(409,{message:'Your existing profile needs an account link. Please contact support.'});
  }
  await db.batch([
    db.prepare(`INSERT INTO users(id,email,phone,status) VALUES(?,?,?,'pending_verification') ON CONFLICT(id) DO NOTHING`)
      .bind(identity.id,email,phone),
    db.prepare(`INSERT INTO auth_identities(provider,subject,user_id) VALUES('supabase',?,?) ON CONFLICT(provider,subject) DO NOTHING`)
      .bind(identity.id,identity.id),
  ]);
  return identity.id;
}
