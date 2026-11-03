"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Heart, LockKeyhole, MapPin, MessageCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";
import { getProfileByUserId, getFavorites, addFavorite, removeFavorite, getUnlocks, unlockContact, getInterests, sendInterest, respondToInterest, getSubscription, blockUser, createReport, createMediationRequest } from "@camatrimony/api-client";
import { computeSimpleAstrologyMatch, scorePreferenceMatch, type CandidateProfile } from "@camatrimony/shared";
import { getProfileDisplayName, getProfilePhotoList, LOCKED_PHOTO_BLUR_CLASS } from "@/lib/profile-display";

type Profile = CandidateProfile & Record<string, unknown>;
type Interest = { id: number; status: string; incoming: boolean };
type DialogName = "unlock" | "block" | "report" | "mediation" | null;

function ProfileDetail() {
  const params = useSearchParams();
  const profileId = params.get("id") || "";
  const { user, dbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [saved, setSaved] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [contact, setContact] = useState<{ phone?: string; email?: string }>({});
  const [balance, setBalance] = useState(0);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dialog, setDialog] = useState<DialogName>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(`/profile${profileId ? `?id=${profileId}` : ""}`)}`); return; }
    if (!profileId) router.replace(`/profile?id=${encodeURIComponent(user.uid)}`);
  }, [authLoading, user, profileId, router]);

  useEffect(() => {
    if (!user || !profileId || authLoading) return;
    let cancelled = false;
    setLoading(true); setError(""); setPhotoIndex(0); setContact({}); setUnlocked(false); setInterest(null); setSaved(false); setBalance(0);
    async function load() {
      try {
        const result = await getProfileByUserId(profileId);
        if (cancelled) return;
        if (!result.success || !result.data) { setProfile(null); setError(result.error || "This profile is unavailable."); return; }
        setProfile(result.data as Profile);
        // A secondary panel failing must not erase a successfully loaded profile.
        const results = await Promise.allSettled([getFavorites(user!.uid), getUnlocks(user!.uid), getSubscription(), getInterests(user!.uid)]);
        if (cancelled) return;
        const data = (index: number): any => results[index].status === "fulfilled" ? results[index].value : null;
        const favorites = data(0)?.data;
        if (Array.isArray(favorites)) setSaved(favorites.some((f: any) => (f.favoritedUserId || f.user_id) === profileId));
        const unlocks = data(1)?.data;
        if (Array.isArray(unlocks)) {
          const record = unlocks.find((u: any) => (u.unlockedUserId || u.unlocked_user_id) === profileId);
          setUnlocked(!!record);
          if (record) setContact({ phone: record.phone, email: record.email });
        }
        const subscription = data(2)?.data;
        if (subscription?.isActive) setBalance(Math.max(0, Number(subscription.contactLimitBalance ?? subscription.contact_limit_balance) || 0));
        const interests = data(3)?.data;
        if (Array.isArray(interests)) {
          const record = interests.find((i: any) => (i.senderId || i.sender_id) === user!.uid && (i.receiverId || i.receiver_id) === profileId)
            || interests.find((i: any) => (i.senderId || i.sender_id) === profileId && (i.receiverId || i.receiver_id) === user!.uid);
          if (record) setInterest({ id: record.id, status: record.status, incoming: (record.senderId || record.sender_id) === profileId });
        }
      } catch { if (!cancelled) { setProfile(null); setError("Could not load this profile. Please try again."); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [user, profileId, authLoading, refresh]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    if (dialog && !element.open) element.showModal();
    else if (!dialog && element.open) element.close();
  }, [dialog]);

  async function action(key: string, task: () => Promise<{ success: boolean; error?: string }>, success: string) {
    if (busy) return;
    setBusy(key); setNotice("");
    try {
      const result = await task();
      if (!result.success) throw new Error(result.error || "Could not complete this action.");
      setNotice(success); setDialog(null); setReason(""); return true;
    } catch (err) { setNotice(err instanceof Error ? err.message : "Please try again."); return false; }
    finally { setBusy(""); }
  }

  if (loading || authLoading || !user) return <div className="site-container profile-loading" role="status"><div className="profile-skeleton" /><p>Loading profile…</p></div>;
  if (error || !profile) return <div className="site-container"><div className="app-empty"><ShieldCheck size={30} /><h1>Profile unavailable</h1><p>{error || "This profile may no longer be available."}</p><div className="flex flex-wrap justify-center gap-3"><button className="site-action" onClick={() => setRefresh(value => value + 1)}>Try again</button><Link className="site-action site-action-outline" href="/dashboard">Back to matches</Link></div></div></div>;

  const self = profileId === user.uid;
  const canSeePhoto = self || profile.canViewPhotos === true || unlocked;
  const name = getProfileDisplayName(profile);
  const photos = getProfilePhotoList(profile, canSeePhoto);
  const fit = dbUser && !self ? scorePreferenceMatch(dbUser, profile) : null;
  const text = (camel: string, snake?: string) => {
    const value = profile[camel] ?? (snake ? profile[snake] : null);
    return typeof value === "string" && value.trim() ? value : typeof value === "number" ? String(value) : "Not shared";
  };
  const astrology = !self ? computeSimpleAstrologyMatch({ rasi: dbUser?.rasi, nakshatram: dbUser?.nakshatram, kujaDosham: dbUser?.kujaDosham }, { rasi: String(profile.rasi || ""), nakshatram: String(profile.nakshatram || ""), kujaDosham: String(profile.kujaDosham || profile.kuja_dosham || "") }) : null;
  const groups = [
    { title: "The essentials", rows: [["Profile managed by", text("profileCreatedBy", "profile_created_by")], ["Gender", text("gender")], ["Age", profile.age ? `${profile.age} years` : "Not shared"], ["Height", text("height")], ["Weight", profile.weight ? `${profile.weight} kg` : "Not shared"], ["Marital status", text("maritalStatus", "marital_status")], ["Mother tongue", text("motherTongue", "mother_tongue")], ["Diet", text("diet")], ["Physical status", text("physicalStatus", "physical_status")], ["Religion", text("religion")], ["Community", text("caste")], ["Subcommunity", text("subcaste")], ["Gothram", text("gothram")]] },
    { title: "Career & education", rows: [["Qualification", text("highestDegree")], ["Occupation", text("occupation")], ["Employed in", text("employedIn", "employed_in")], ["Annual income", text("annualIncome")], ["Work location", text("workLocation")]] },
    { title: "Location", rows: [["City", text("city")], ["State", text("state")], ["Country", text("country")], ["Living abroad", profile.isNri === true || profile.is_nri === 1 ? "Yes" : "No"]] },
    { title: "Family", rows: [["Family status", text("familyStatus", "family_status")], ["Family type", text("familyType", "family_type")], ["Family values", text("familyValues", "family_values")], ["Father’s occupation", text("fatherOccupation", "father_occupation")], ["Mother’s occupation", text("motherOccupation", "mother_occupation")], ["Siblings", text("siblingCount", "sibling_count")]] },
    { title: "Birth & astrology", rows: [["Date of birth", text("birthDate", "birth_date")], ["Time of birth", text("birthTime", "birth_time")], ["Place of birth", text("birthPlace", "birth_place")], ["Rasi", text("rasi")], ["Nakshatra", text("nakshatram")], ["Kuja dosham", text("kujaDosham", "kuja_dosham")]] },
    { title: "Looking for", rows: [["Age range", text("partnerAgeRange", "partner_age_range")], ["Community", text("partnerCaste", "partner_caste")], ["Education", text("partnerEducation", "partner_education")], ["Minimum annual income", text("partnerIncomeMin", "partner_income_min")]] },
  ];
  return <div className="site-container profile-page">
    <Link href="/dashboard" className="profile-back"><ArrowLeft size={16} />Back to matches</Link>
    {notice && <div role="status" className="app-notice">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
    <div className="profile-overview">
      <div className="profile-gallery"><div className="profile-main-photo"><img src={photos[photoIndex] || photos[0]} alt={`${name}'s profile photo`} className={!canSeePhoto ? LOCKED_PHOTO_BLUR_CLASS : ""} onError={e => { e.currentTarget.src = "/avatar-placeholder.svg"; }} />{!canSeePhoto && <span><LockKeyhole size={13} />Photo preview</span>}</div>
        {photos.length > 1 && <div className="profile-thumbnails">{photos.map((photo, index) => <button key={`${photo}-${index}`} aria-label={`View photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><img src={photo} alt="" className={!canSeePhoto ? LOCKED_PHOTO_BLUR_CLASS : ""} /></button>)}</div>}
      </div>
      <div className="profile-intro"><div className="profile-badges"><span>{text("highestDegree")}</span>{profile.isVerified && <span><ShieldCheck size={14} />Verified profile</span>}</div><h1>{name}</h1><p className="profile-intro-meta">{profile.age || "—"} years <span>·</span> {text("height")} <span>·</span> {text("caste")}</p><p className="profile-occupation">{text("occupation")}</p><p className="profile-location"><MapPin size={15} />{text("workLocation")}</p><p className="profile-about-short">{profile.aboutMe || "This member hasn’t added an introduction yet."}</p>
        <div className="profile-primary-actions">{self ? <Link href="/profile/edit" className="site-action">Edit your profile<ArrowUpRight size={16} /></Link> : <>
          {interest?.status === "accepted" ? <Link className="site-action" href={`/chat?id=${encodeURIComponent(profileId)}`}><MessageCircle size={16} />Start a conversation</Link> : interest?.incoming && interest.status === "pending" ? <><button className="site-action" disabled={!!busy} onClick={async () => { if (await action("accept", () => respondToInterest(interest.id, "accepted"), "Interest accepted.")) setInterest({ ...interest, status: "accepted" }); }}>Accept interest</button><button className="site-action site-action-outline" disabled={!!busy} onClick={async () => { if (await action("decline", () => respondToInterest(interest.id, "declined"), "Interest declined.")) setInterest({ ...interest, status: "declined" }); }}>Decline</button></> : <button className="site-action" disabled={!!busy || interest?.status === "pending"} onClick={async () => { if (await action("interest", () => sendInterest(user.uid, profileId), "Interest sent.")) setInterest({ id: 0, status: "pending", incoming: false }); }}>{busy === "interest" ? "Sending…" : interest?.status === "pending" ? "Interest sent" : "Send interest"}</button>}
          <button className="site-icon-button" aria-label={saved ? "Remove from saved" : "Save profile"} aria-pressed={saved} disabled={!!busy} onClick={async () => { if (await action("save", () => saved ? removeFavorite(user.uid, profileId) : addFavorite(user.uid, profileId), saved ? "Removed from saved profiles." : "Profile saved.")) setSaved(!saved); }}><Heart size={19} fill={saved ? "currentColor" : "none"} /></button>
        </>}</div>
        {!self && <p className="profile-safe-note"><ShieldCheck size={14} />Share an interest before sharing a conversation.</p>}
      </div>
    </div>
    <div className="profile-details-layout"><div className="profile-details-main">
      <section className="profile-section"><h2>A little about {name.split(" ")[0]}</h2><p>{profile.aboutMe || "An introduction hasn’t been shared yet."}</p></section>
      {groups.map(group => <section className="profile-section" key={group.title}><h2>{group.title}</h2><dl className="profile-facts">{group.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}
      {astrology && <section className="profile-section"><h2>Astrology overview</h2><p>Rasi: {text("rasi")} · Nakshatra: {text("nakshatram")}</p><details className="profile-reasons"><summary>View indicative alignment</summary><p>{astrology.disclaimer}</p>{astrology.factors.map(f => <div key={f.name}><span>{f.name}</span><span>{f.note}</span></div>)}</details></section>}
    </div><aside className="profile-details-sidebar">
      {fit && <section className="profile-section profile-fit"><Sparkles size={21} /><h2>{fit.score === null ? "Your preferences" : `${fit.score}% preference match`}</h2><p>Based on what you’re looking for.</p><div className="profile-factor-list">{fit.factors.map(f => <div key={f.key}><span>{f.label}</span><span>{f.status === "matched" ? <><Check size={13} />Matches</> : f.status === "unknown" ? "Not shared" : "Outside preference"}</span></div>)}</div><Link href="/dashboard">Edit preferences<ArrowUpRight size={14} /></Link></section>}
      {!self && <section className="profile-section"><h2>Make a connection</h2>{unlocked ? <><p className="profile-unlocked"><ShieldCheck size={15} />Contact unlocked</p><dl className="profile-contact"><dt>Phone</dt><dd>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : "Not shared"}</dd><dt>Email</dt><dd>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "Not shared"}</dd></dl></> : <><p>Unlock contact details when you’re ready.</p><button className="site-action w-full" onClick={() => { setNotice(""); setDialog("unlock"); }}><LockKeyhole size={15} />Unlock contact</button><small>{balance} contact credits available</small></>}<button className="site-action site-action-outline w-full mt-3" onClick={() => { setNotice(""); setDialog("mediation"); }}>Request an introduction</button></section>}
      {!self && <div className="profile-safety-actions"><button onClick={() => { setNotice(""); setReason(""); setDialog("report"); }}>Report profile</button><button onClick={() => { setNotice(""); setDialog("block"); }}>Block profile</button></div>}
    </aside></div>
    <dialog ref={dialogRef} className="app-dialog" onCancel={() => setDialog(null)} onClose={() => setDialog(null)}><div className="app-dialog-heading"><h2>{dialog === "unlock" ? "Unlock contact?" : dialog === "report" ? "Report profile" : dialog === "block" ? "Block profile?" : "Request an introduction"}</h2><button aria-label="Close dialog" className="site-icon-button" onClick={() => setDialog(null)}><X size={18} /></button></div>
      {dialog === "unlock" && <><p>View contact details for {name}. This uses one credit.</p><p className="app-dialog-balance">{balance} credits available</p>{balance > 0 ? <button disabled={!!busy} className="site-action" onClick={async () => { let details: any; const ok = await action("unlock", async () => { const result = await unlockContact(user.uid, profileId); details = result.data; return result; }, "Contact unlocked."); if (ok) { setUnlocked(true); setContact({ phone: details?.phone, email: details?.email }); if (!details?.alreadyUnlocked) setBalance(value => Math.max(0, value - 1)); } }}>{busy ? "Unlocking…" : "Confirm unlock"}</button> : <Link className="site-action" href="/plans">View memberships</Link>}</>}
      {dialog === "block" && <><p>{name} will be removed from your matches and won’t be able to message you. You can unblock them in Settings.</p><button disabled={!!busy} className="site-action" onClick={async () => { if (await action("block", () => blockUser(user.uid, profileId), "Profile blocked.")) router.push("/dashboard"); }}>{busy ? "Blocking…" : "Block profile"}</button></>}
      {dialog === "report" && <form onSubmit={async e => { e.preventDefault(); await action("report", () => createReport(user.uid, profileId, reason), "Report received. Our team will review it."); }}><label className="site-field">What should we know?<textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={10} maxLength={2000} rows={4} /></label><button disabled={!!busy} className="site-action" type="submit">{busy ? "Submitting…" : "Submit report"}</button></form>}
      {dialog === "mediation" && <form onSubmit={async e => { e.preventDefault(); await action("mediation", () => createMediationRequest(user.uid, profileId, date, time, reason), "Introduction requested."); }}><p>Choose a preferred time for our team to help you connect.</p><div className="grid grid-cols-2 gap-3"><label className="site-field">Preferred date<input required type="date" min={new Date().toLocaleDateString("en-CA")} value={date} onChange={e => setDate(e.target.value)} /></label><label className="site-field">Preferred time<input required type="time" value={time} onChange={e => setTime(e.target.value)} /></label></div><label className="site-field">Notes (optional)<textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={!!busy} className="site-action" type="submit">{busy ? "Submitting…" : "Request introduction"}</button></form>}
      {notice && <p role="alert" className="form-error">{notice}</p>}
    </dialog>
  </div>;
}

export default function ProfilePage() {
  return <Layout><Suspense fallback={<div className="profile-loading" role="status">Loading profile…</div>}><ProfileDetail /></Suspense></Layout>;
}
