"use client";

import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { PreferenceMatch } from "@camatrimony/shared";
import { getProfileDisplayName, getProfilePhotoSrc, type ProfileLike } from "@/lib/profile-display";

interface MatchCardProfile extends ProfileLike {
  userId: string; age: number; height: string; caste: string;
  occupation: string; annualIncome: string; workLocation: string;
  highestDegree: string; isVerified: boolean; match?: PreferenceMatch;
}

export default function MatchCard({ profile, rank, unlocked, saved, pending, accepted, onSave, onUnlock, onInterest, onAstro, busy }: {
  profile: MatchCardProfile; rank?: number; unlocked: boolean; saved: boolean; pending: boolean; accepted: boolean;
  onSave: () => void; onUnlock: () => void; onInterest: () => void; onAstro: () => void; busy: boolean;
}) {
  const name = getProfileDisplayName(profile);
  const degree = profile.highestDegree.match(/\b(?:CA|CS|CMA|MBA|CFA)\b/)?.[0] || profile.highestDegree;
  return <article className="match-card group overflow-hidden rounded-2xl border border-[#e8e1d8] bg-[#fffefa] transition-shadow hover:shadow-[0_12px_32px_-14px_#6d4d3033]">
    <div className="relative aspect-[1.8] md:aspect-[1.45] overflow-hidden bg-[#e5e0d9]">
      <Link href={`/profile?id=${encodeURIComponent(profile.userId)}`} aria-label={`View ${name}'s profile`} className="block h-full">
          <img src={getProfilePhotoSrc(profile, true)} alt={`${name}, ${profile.occupation}`} className="h-full w-full object-cover object-[center_30%] transition-transform duration-500 group-hover:scale-[1.03]" onError={e => { e.currentTarget.style.display = "none"; }} />
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5" />
      {rank && rank <= 3 ? <span className="absolute left-4 top-4 rounded-full border border-white/60 bg-[#fffefa]/95 px-2.5 py-1 text-[10px] font-semibold text-[#70552e]">#{rank} for you</span> : null}
      <button disabled={busy} aria-label={`${saved ? "Remove" : "Save"} ${name}`} aria-pressed={saved} onClick={onSave} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#702c36] shadow-sm transition-transform hover:scale-105 disabled:opacity-50"><Heart size={17} strokeWidth={1.6} fill={saved ? "currentColor" : "none"} /></button>
      <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-black/20 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">{profile.isVerified ? <><ShieldCheck size={13} />Verified profile</> : <>Verification pending</>}</span>
    </div>
    <div className="p-5">
      <div className="mb-2.5 flex items-start justify-between gap-2"><div><Link href={`/profile?id=${encodeURIComponent(profile.userId)}`} className="text-[19px] font-semibold tracking-tight text-[#302722] hover:text-[#702c36]">{name}</Link><p className="mt-1 text-xs text-[#76695e]">{profile.age} yrs <span className="mx-1.5 text-[#d4c8bb]">·</span>{profile.height}<span className="mx-1.5 text-[#d4c8bb]">·</span>{profile.caste}</p></div><span className="rounded-md bg-[#f3ecdf] px-2 py-1 text-[10px] font-bold text-[#8b6b36]">{degree}</span></div>
      <p className="truncate text-[13px] font-medium text-[#665a50]">{profile.occupation}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#76695e]"><span className="flex items-center gap-1"><MapPin size={12} />{profile.workLocation}</span><span>{profile.annualIncome || "Income not shared"}</span></div>
      <details className="mt-4 rounded-xl border border-[#e5e9df] bg-[#f3f5ef] px-3 py-2.5">
        <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-2 text-xs text-[#54705b]"><span className="flex items-center gap-1.5 font-semibold"><Sparkles size={13} />{profile.match?.score != null ? `${profile.match.score}% preference match` : "Set preferences to rank"}</span><ChevronDown size={14} /><span className="col-span-2 text-[11px] font-normal text-[#67705d]">Why this match</span></summary>
        <div className="mt-2 space-y-1.5 border-t border-[#dfe5d8] pt-2">{profile.match?.factors.map(f => <div key={f.key} className="flex items-center justify-between gap-3 text-[10px]"><span>{f.label}</span><span className={f.status === "matched" ? "text-[#54705b]" : "text-[#776b60]"}>{f.status === "matched" ? "Matches" : f.status === "unknown" ? "Not shared" : "Outside preference"}{f.status === "matched" && <Check size={10} className="ml-1 inline" />}</span></div>)}{!profile.match?.factors.length && <p className="text-[10px]">Add your partner preferences.</p>}</div>
      </details>
      <div className="mt-4 flex items-center gap-2"><button disabled={busy || pending || accepted} onClick={onInterest} className="match-primary flex-1 disabled:cursor-default disabled:opacity-60">{accepted ? "Connected" : pending ? "Interest sent" : busy ? "Please wait…" : "Send interest"}</button><Link href={`/profile?id=${encodeURIComponent(profile.userId)}`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8e1d8] text-[#702c36] hover:bg-[#f7eeeb]" aria-label={`View ${name}`}><ArrowUpRight size={18} /></Link></div>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#7b6c60]"><button onClick={onUnlock} className="min-h-11 px-1 hover:text-[#702c36]">{unlocked ? "Contact details" : "Unlock contact"}</button><button onClick={onAstro} className="min-h-11 px-1 hover:text-[#702c36]">Astro match</button></div>
    </div>
  </article>;
}
