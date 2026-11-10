"use client";
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Loader2,Unlock,CalendarDays} from 'lucide-react';
import MemberShell from '@/components/matches/MemberShell';
import {useAuth} from '@/context/AuthContext';
import {getSubscription,getCreditHistory,type CreditEntry} from '@camatrimony/api-client';

const date=(raw:string)=>new Date(/Z$|[+-]\d\d:\d\d$/.test(raw)?raw:`${raw.replace(' ','T')}Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
export default function MyPlanPage(){
  const {user,loading:authLoading}=useAuth();const router=useRouter();
  const [subscription,setSubscription]=useState<any>(null);const [history,setHistory]=useState<CreditEntry[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const [plan,credits]=await Promise.all([getSubscription(),getCreditHistory()]);
    if(!plan.success||!credits.success)setError(plan.error||credits.error||'Could not load your membership.');
    else{setSubscription(plan.data);setHistory(credits.data||[]);}
    setLoading(false);
  },[]);
  useEffect(()=>{if(!authLoading&&!user)router.replace('/login?next=%2Fmy-plan');else if(user)void load();},[user,authLoading,router,load]);
  return <MemberShell><div className="site-container max-w-4xl py-8 md:py-12">
    <header className="mb-8"><p className="site-eyebrow">MEMBERSHIP</p><h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">Your plan. Your next step.</h1><p className="mt-3 text-[#776b60]">Membership, contact credits and recent activity.</p></header>
    {authLoading||loading?<div className="profile-loading" role="status"><Loader2 className="animate-spin"/>Loading membership…</div>:error?<div role="alert" className="rounded-2xl bg-white border p-6"><p>{error}</p><button onClick={load} className="site-button-small mt-4">Try again</button></div>:<>
      <section className="rounded-3xl border border-[#e9e4de] bg-[#fffefa] p-6 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-4"><h2 className="text-2xl font-semibold">{subscription?.planName||'Free membership'}</h2><span className="rounded-full bg-[#f3eee7] px-4 py-2 text-sm capitalize">{subscription?.status||'No paid plan'}</span></div>
        <div className="grid gap-6 sm:grid-cols-2 my-7 border-y border-[#e9e4de] py-6">
          <div><p className="flex items-center gap-2 text-sm text-[#776b60]"><Unlock size={17}/>Available contact credits</p><p className="mt-2 text-4xl font-semibold">{subscription?.isActive?subscription.contactLimitBalance:0}</p>{subscription&&<p className="mt-2 text-sm text-[#776b60]">{subscription.creditsGranted??subscription.contact_limit??0} included in this plan</p>}</div>
          <div><p className="flex items-center gap-2 text-sm text-[#776b60]"><CalendarDays size={17}/>{subscription?.status==='scheduled'?'Starts on':'Valid until'}</p><p className="mt-3 text-xl font-medium">{subscription?date(subscription.status==='scheduled'?subscription.startsAt:subscription.expiresAt):'—'}</p></div>
        </div>
        <p className="text-sm text-[#776b60]">One credit unlocks one member’s contact details. Repeat views are free. Unused credits expire with your plan.</p>
        <div className="flex flex-wrap gap-3 mt-6"><Link href="/plans" className="site-action">View memberships</Link><Link href="/dashboard" className="site-action site-action-outline">Discover matches</Link></div>
      </section>
      <section className="mt-8"><h2 className="text-xl font-semibold mb-4">Credit activity</h2><div className="rounded-2xl border border-[#e9e4de] bg-[#fffefa] divide-y divide-[#e9e4de]">
        {history.length?history.map(entry=><div key={entry.id} className="flex justify-between items-center gap-4 p-5"><div><p className="font-medium">{entry.reason==='contact_unlock'?'Contact unlocked':entry.reason==='opening_balance'?'Opening balance':'Plan credits added'}</p><p className="mt-1 text-xs text-[#776b60]">{date(entry.created_at)}{entry.profileId&&<> · <Link className="underline" href={`/profile?id=${encodeURIComponent(entry.profileId)}`}>View profile</Link></>}</p></div><div className="text-right"><p className="font-semibold">{entry.amount>0?'+':''}{entry.amount}</p><p className="text-xs text-[#776b60]">{entry.balance_after} after activity</p></div></div>):<p className="p-6 text-sm text-[#776b60]">Your credit activity will appear here.</p>}
      </div></section>
    </>}
  </div></MemberShell>;
}
