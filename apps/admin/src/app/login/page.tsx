"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, ArrowUpRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { usesSupabaseAuth } from '@camatrimony/auth/client';
import './auth.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if(session) router.replace('/'); }, [session, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if(busy) return;
    setBusy(true); setError('');
    try {
      const result = await login(username.trim(), password);
      if(!result.success) setError(result.error || 'Please check your sign-in details.');
      else router.replace('/');
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="admin-auth-page">
    <header className="admin-auth-header"><a className="admin-auth-brand" href="https://camatrimonybncn.com"><img src="/logo.png" alt="" width="44" height="44"/><span>CA Matrimony<small>BNCN · ADMINISTRATION</small></span></a><a className="admin-auth-back" href="https://camatrimonybncn.com">Back to website<ArrowUpRight size={16}/></a></header>
    <main className="admin-auth-main">
      <section className="admin-auth-story"><p className="admin-auth-eyebrow">THE PEOPLE BEHIND THE CONNECTIONS</p><h1>Your community,<br/><em>well cared for.</em></h1><p className="admin-auth-description">Manage profiles, verification and memberships.</p><div className="admin-auth-art" aria-hidden="true"><svg viewBox="0 0 360 180" fill="none"><path d="M30 110C30 20 170 20 170 110S310 200 310 90" stroke="currentColor"/><path d="M55 135C55 45 195 45 195 135S335 165 335 65" stroke="currentColor" strokeOpacity=".35"/><circle cx="30" cy="110" r="5" fill="currentColor"/><circle cx="170" cy="110" r="5" fill="currentColor"/><circle cx="310" cy="90" r="5" fill="currentColor"/></svg></div></section>
      <section className="admin-auth-card" aria-labelledby="admin-sign-in-heading"><span className="admin-auth-icon"><ShieldCheck size={24} strokeWidth={1.4}/></span><p className="admin-auth-eyebrow">ADMIN WORKSPACE</p><h2 id="admin-sign-in-heading">Welcome back.</h2><p className="admin-auth-card-intro">Sign in to manage your community.</p>
        <form onSubmit={submit} className="admin-auth-form" aria-busy={busy}>
          <label htmlFor="admin-username">{usesSupabaseAuth ? 'Administrator email' : 'Username'}</label><input id="admin-username" name="username" type={usesSupabaseAuth ? 'email' : 'text'} required autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} disabled={busy} placeholder={usesSupabaseAuth ? 'admin@camatrimonybncn.com' : 'Enter your username'}/>
          <label htmlFor="admin-password">Password</label><div className="admin-auth-password"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          {error && <div className="admin-auth-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
          <button id="admin-login-submit" className="admin-auth-submit" type="submit" disabled={busy || !username.trim() || !password}>{busy ? <><Loader2 size={17} className="animate-spin"/>Signing in…</> : <>Sign in<ArrowRight size={17}/></>}</button>
        </form><p className="admin-auth-note"><ShieldCheck size={14}/>Authorized administrators only.</p>
      </section>
    </main><footer className="admin-auth-footer">CA Matrimony BNCN<span>A shared future. Thoughtfully managed.</span></footer>
  </div>;
}
