"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Lock,
  Sparkles,
  Unlock,
  ChevronRight,
  ShieldCheck,
  X,
  AlertCircle,
  SlidersHorizontal,
  MapPin,
} from "lucide-react";
import MemberShell from "@/components/matches/MemberShell";
import MatchCard from "@/components/matches/MatchCard";
import PreferencesPanel from "@/components/matches/PreferencesPanel";
import type { PreferenceMatch } from "@camatrimony/shared";
import { Button, Select, Pagination } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import {
  MATCH_SORT_OPTIONS,
  DEGREE_FILTER_OPTIONS,
  RELIGION_FILTER_OPTIONS,
} from "@camatrimony/shared";
import {
  getProfiles,
  getUnlocks,
  unlockContact,
  getFavorites,
  addFavorite,
  removeFavorite,
  getInterests,
  sendInterest,
  createMediationRequest,
  getSubscription,
} from "@camatrimony/api-client";
import { computeSimpleAstrologyMatch } from "@camatrimony/shared";
import {
  getProfileDisplayName,
  type ProfileLike,
} from "@/lib/profile-display";

interface CandidateProfile extends ProfileLike {
  userId: string;
  match?: PreferenceMatch;
  profileCreatedBy: string;
  gender: string;
  diet: string;
  age: number;
  height: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  highestDegree: string;
  employedIn: string;
  occupation: string;
  annualIncome: string;
  workLocation: string;
  isNri: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  photos: string[];
  user_email?: string;
  aboutMe?: string;
  lastActiveAt?: string;
}

export default function DashboardPage() {
  const { user, dbUser, loading } = useAuth();
  const router = useRouter();

  // Catalog profiles and unlocks lists
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [sentInterests, setSentInterests] = useState<any[]>([]);
  const [, setReceivedInterests] = useState<any[]>([]);
  const [unlockBalance, setUnlockBalance] = useState(0);
  const [, setUnlockedContacts] = useState<Record<string, { phone?: string; email?: string }>>({});
  const [fetching, setFetching] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filter form states
  const [genderFilter, setGenderFilter] = useState("");
  const [casteFilter, setCasteFilter] = useState("");
  const [religionFilter, setReligionFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [nriFilter, setNriFilter] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [minAgeFilter, setMinAgeFilter] = useState(18);
  const [maxAgeFilter, setMaxAgeFilter] = useState(70);
  const [sortByFilter, setSortByFilter] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const catalogRequest = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => { setLocationFilter(search); setCurrentPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Apply landing quick-search query params once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const lookingFor = params.get("lookingFor");
    const genderParam = params.get("gender");
    const religion = params.get("religion");
    const degree = params.get("degree");
    const ageMin = Number(params.get("ageMin"));
    const ageMax = Number(params.get("ageMax"));

    // lookingFor=Bride|Groom maps to catalog gender; explicit gender= still works
    let gender = genderParam || "";
    if (!gender && lookingFor) {
      if (lookingFor === "Bride") gender = "Female";
      else if (lookingFor === "Groom") gender = "Male";
      else if (lookingFor === "Female" || lookingFor === "Male") gender = lookingFor;
    }
    if (gender) setGenderFilter(gender);
    if (religion) setReligionFilter(religion);
    if (degree) setDegreeFilter(degree);
    if (Number.isFinite(ageMin) && ageMin > 0) setMinAgeFilter(ageMin);
    if (Number.isFinite(ageMax) && ageMax > 0) setMaxAgeFilter(ageMax);
  }, []);

  // Interactive dialog controls
  const [selectedProfile, setSelectedProfile] = useState<CandidateProfile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [unlocking, setUnlocking] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);

  // Astro Compatibility & Assisted Mediation states
  const [showAstroModal, setShowAstroModal] = useState(false);
  const [astroResult, setAstroResult] = useState<{
    score: number;
    tier: string;
    details: { name: string; score: number; max: number; desc: string }[];
    disclaimer?: string;
  } | null>(null);
  const [showMediationForm, setShowMediationForm] = useState(false);
  const [mediationDate, setMediationDate] = useState("");
  const [mediationTime, setMediationTime] = useState("");
  const [mediationNote, setMediationNote] = useState("");
  const [, setSubmittingMediation] = useState(false);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Deterministic astro score check helper — simple explainable scorer (not Ashtakoota)
  const checkAstrologyCompatibility = (partner: CandidateProfile) => {
    const result = computeSimpleAstrologyMatch(
      {
        rasi: dbUser?.rasi,
        nakshatram: dbUser?.nakshatram,
        kujaDosham: dbUser?.kujaDosham,
      },
      {
        rasi: (partner as any).rasi,
        nakshatram: (partner as any).nakshatram,
        kujaDosham: (partner as any).kujaDosham,
      }
    );

    setAstroResult({
      score: result.percent,
      tier: `${result.label} (${result.percent}%)`,
      details: result.factors.map((f) => ({
        name: f.name,
        score: f.points,
        max: f.max,
        desc: f.note,
      })),
      disclaimer: result.disclaimer,
    });
    setSelectedProfile(partner);
    setShowAstroModal(true);
    setShowMediationForm(false);
  };

  // Fetch bookmarks, unlocks, interests and profiles
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const request = ++catalogRequest.current;
    setFetching(true);
    setLoadError("");
    try {
      // 1. Fetch unlocks + subscription together so balance is never stale
      const [unlocksRes, subRes] = await Promise.all([
        getUnlocks(user.uid),
        getSubscription().catch(() => ({ success: false as const, data: null })),
      ]);

      let usedUnlocks = 0;
      if (unlocksRes.success && unlocksRes.data) {
        const unlocks = unlocksRes.data as any[];
        const ids = unlocks.map((un: any) => un.unlockedUserId || un.unlocked_user_id);
        usedUnlocks = ids.length;
        setUnlockedIds(ids);
        const contactsMap: Record<string, { phone?: string; email?: string }> = {};
        unlocks.forEach((un: any) => {
          const uid = un.unlockedUserId || un.unlocked_user_id;
          if (uid) {
            contactsMap[uid] = {
              phone: un.phone || un.targetPhone,
              email: un.email || un.targetEmail,
            };
          }
        });
        setUnlockedContacts(contactsMap);
      }

      let contactLimit = 20;
      if (subRes.success && subRes.data && subRes.data.isActive) {
        const sub = subRes.data as any;
        if (sub.contactLimitBalance != null || sub.contact_limit_balance != null) {
          setUnlockBalance(Math.max(0, Number(sub.contactLimitBalance ?? sub.contact_limit_balance)));
        } else {
          contactLimit = Number(sub.contactLimit ?? sub.contact_limit ?? 20);
          setUnlockBalance(Math.max(0, contactLimit - usedUnlocks));
        }
      } else {
        setUnlockBalance(0);
      }

      // 2. Fetch favorites shortlist
      const favRes = await getFavorites(user.uid);
      if (favRes.success && favRes.data) {
        const fIds = (favRes.data as any[]).map((f: any) => f.favoritedUserId || f.user_id);
        setFavoriteIds(fIds);
      }

      // 3. Fetch sent & received interests
      const intRes = await getInterests(user.uid, "all");
      if (intRes.success && intRes.data) {
        const all = intRes.data as any[];
        setSentInterests(all.filter((i: any) => i.senderId === user.uid || i.sender_id === user.uid));
        setReceivedInterests(all.filter((i: any) => i.receiverId === user.uid || i.receiver_id === user.uid));
      }

      // 4. Fetch candidates profiles (wire dashboard filters)
      const catalogRes: any = await getProfiles({
        page: currentPage,
        pageSize,
        gender: genderFilter || undefined,
        caste: casteFilter || undefined,
        religion: religionFilter || undefined,
        ageMin: minAgeFilter,
        ageMax: maxAgeFilter,
        degree: degreeFilter || undefined,
        isNri: nriFilter || undefined,
        location: locationFilter || undefined,
        sortBy: sortByFilter || undefined,
      });
      if (request !== catalogRequest.current) return;
      if (catalogRes.success && catalogRes.data) {
        // Exclude own profile
        const filteredList = (catalogRes.data as any[]).filter((p: any) => p.userId !== user.uid);
        setCandidates(filteredList);
        const pag = catalogRes.pagination || catalogRes;
        setTotalPages(pag.totalPages || 1);
        setTotalItems(pag.total || pag.totalItems || 0);
      } else { setLoadError(catalogRes.error || "Could not load matches."); }
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
      setLoadError("Could not load matches. Please try again.");
    } finally {
      if (request === catalogRequest.current) setFetching(false);
    }
  }, [user, currentPage, pageSize, genderFilter, casteFilter, religionFilter, degreeFilter, nriFilter, locationFilter, minAgeFilter, maxAgeFilter, sortByFilter]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData, dbUser?.partnerAgeRange, dbUser?.partnerCaste, dbUser?.partnerIncomeMin, dbUser?.partnerEducation]);

  useEffect(() => { setCurrentPage(1); }, [dbUser?.partnerAgeRange, dbUser?.partnerCaste, dbUser?.partnerIncomeMin, dbUser?.partnerEducation]);

  // Route protection + incomplete onboarding gate
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      const next = `/dashboard${qs}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!dbUser || !dbUser.isOnboardingCompleted) {
      router.push(`/onboarding?next=${encodeURIComponent(`/dashboard${window.location.search}`)}`);
    }
  }, [user, dbUser, loading, router]);

  // Shortlisting
  const toggleShortlist = async (profileId: string) => {
    try {
      const isFav = favoriteIds.includes(profileId);
      if (isFav) {
        const res = await removeFavorite(user!.uid, profileId);
        if (res.success) {
          setFavoriteIds(prev => prev.filter(id => id !== profileId));
          addToast("success", "Shortlist Updated", "Removed from saved profiles.");
        }
      } else {
        const res = await addFavorite(user!.uid, profileId);
        if (res.success) {
          setFavoriteIds(prev => [...prev, profileId]);
          addToast("success", "Shortlist Updated", "Profile saved.");
        }
      }
    } catch {
      addToast("error", "Shortlist Error", "Could not toggle shortlist bookmark.");
    }
  };

  // Express Interest
  const handleExpressInterest = async (profileId: string) => {
    setSendingInterest(true);
    try {
      const res = await sendInterest(user!.uid, profileId);
      if (res.success) {
        addToast("success", "Interest sent", "");
        // Refetch to map statuses
        fetchDashboardData();
      } else {
        addToast("error", "Express Interest Failed", res.error || "Failed to express interest.");
      }
    } catch {
      addToast("error", "Error", "Failed to contact edge matchmaking engine.");
    } finally {
      setSendingInterest(false);
    }
  };

  // Unlocking Dialog confirmation
  const triggerUnlock = (profile: CandidateProfile) => {
    setSelectedProfile(profile);
    setShowConfirmModal(true);
  };

  const handleConfirmUnlock = async () => {
    if (!user || !selectedProfile) return;
    setUnlocking(true);

    try {
      const res = await unlockContact(user.uid, selectedProfile.userId);

      if (res.success) {
        const data = res.data as any;
        setUnlockedIds(prev => [...prev, selectedProfile.userId]);
        // Store real contact info returned by the API
        if (data) {
          setUnlockedContacts(prev => ({
            ...prev,
            [selectedProfile.userId]: {
              phone: data.phone || data.targetPhone,
              email: data.email || data.targetEmail,
            },
          }));
        }
        if (!data?.alreadyUnlocked) {
          setUnlockBalance(prev => Math.max(0, prev - 1));
        }
        setShowConfirmModal(false);
        addToast("success", "Credentials Unlocked", `${selectedProfile.occupation.split(',')[0]} contact revealed!`);
      } else {
        addToast("error", "Unlock Failed", res.error || "Failed to unlock.");
      }
    } catch {
      addToast("error", "Network Error", "Could not connect to API.");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading || !user) {
    return (
      <MemberShell>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading your matches…</p>
          </div>
        </div>
      </MemberShell>
    );
  }

  return (
    <MemberShell>
      <div className="max-w-[1360px] mx-auto px-5 lg:px-10 pt-5 md:pt-10 pb-8 space-y-6">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div><p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-[.2em] text-[#aa8a5d] md:block">DISCOVER</p>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-.04em] text-[#302722] md:text-[40px]">Your matches, {dbUser?.fullName?.split(" ")[0] || "there"}<span className="text-[#ad8a5d]">.</span></h1>
            <p className="mt-2 text-[13px] text-[#8a7e73]">People who fit what matters to you.</p>
          </div>
          <Link href="/my-plan" className="hidden items-center gap-3 self-start rounded-xl md:flex border border-[#e8e1d8] bg-[#fffefa] px-4 py-3 text-xs text-[#776958]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ecdc] text-[#a28048]"><Unlock size={15} /></span><span><strong className="block text-sm font-semibold text-[#55422e]">{unlockBalance} contacts</strong>available on your plan</span><ChevronRight size={14} className="ml-3" /></Link>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#e8e1d8] bg-[#fffefa] p-3">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search by location</span><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a39587]" /><input type="search" value={search} onChange={e => setSearch(e.target.value)} className="match-input" style={{ paddingLeft: 36 }} placeholder="Search city" /></label>
          <select value={sortByFilter} onChange={e => { setSortByFilter(e.target.value); setCurrentPage(1); }} aria-label="Sort matches" className="match-input max-w-[148px] sm:max-w-[185px]">{MATCH_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <span className="hidden shrink-0 px-2 text-xs text-[#8a7e73] lg:block">{totalItems} profiles</span>
        </div>

        {/* TWO COLUMN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          
          <div className="flex flex-col gap-4 lg:col-span-3 lg:sticky lg:top-24">
          <PreferencesPanel filtersOpen={showFilters} onToggleFilters={() => setShowFilters(!showFilters)} />
          <button className="hidden w-full items-center justify-between rounded-xl border border-[#e8e1d8] bg-[#fffefa] p-4 lg:flex text-xs font-semibold text-[#65574b]" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="match-filters"><span className="flex items-center gap-2"><Filter size={15} />Search filters</span><span>{showFilters ? "−" : "+"}</span></button>
          <aside id="match-filters" hidden={!showFilters} className="bg-[#fffefa] border border-[#e8e1d8] p-5 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-maroon-500" /> Filter profiles
              </h3>
              <button
                onClick={() => {
                  setGenderFilter("");
                  setCasteFilter("");
                  setReligionFilter("");
                  setDegreeFilter("");
                  setNriFilter(false);
                  setLocationFilter("");
                  setSearch("");
                  setMinAgeFilter(18);
                  setMaxAgeFilter(70);
                  setCurrentPage(1);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-maroon-500 uppercase cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Gender Filters */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                Looking for
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "For me", val: "" },
                  { label: "All", val: "all" },
                  { label: "Male", val: "Male" },
                  { label: "Female", val: "Female" },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setGenderFilter(item.val);
                      setCurrentPage(1);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      genderFilter === item.val
                        ? "bg-maroon-500 border-transparent text-white"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caste Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                Caste / Community
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={casteFilter}
                  onChange={(e) => {
                    setCasteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                  placeholder="e.g. Brahmin, Reddy..."
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Degree Select */}
            <Select
              label="Education"
              labelStyle="filter"
              fieldSize="filter"
              value={degreeFilter}
              onChange={(e) => {
                setDegreeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={DEGREE_FILTER_OPTIONS}
              placeholder={false}
            />

            {/* Religion Select */}
            <Select
              label="Religion"
              labelStyle="filter"
              fieldSize="filter"
              value={religionFilter}
              onChange={(e) => {
                setReligionFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={RELIGION_FILTER_OPTIONS}
              placeholder={false}
            />

            {/* Age Boundaries inputs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                Age: {minAgeFilter} - {maxAgeFilter} Yrs
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={70}
                  value={minAgeFilter}
                  onChange={(e) => {
                    setMinAgeFilter(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-xl text-xs text-center focus:outline-none"
                  placeholder="Min"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  min={18}
                  max={70}
                  value={maxAgeFilter}
                  onChange={(e) => {
                    setMaxAgeFilter(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-xl text-xs text-center focus:outline-none"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* NRI filter */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="checkbox"
                id="nriFilter"
                checked={nriFilter}
                onChange={(e) => {
                  setNriFilter(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded border-slate-200 text-maroon-500 focus:ring-maroon-500 cursor-pointer"
              />
              <label htmlFor="nriFilter" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer tracking-wider">
                NRI Candidates Only
              </label>
            </div>

          </aside>
          <div className="hidden rounded-2xl bg-[#f1ece3] p-5 lg:block"><ShieldCheck size={21} className="mb-3 text-[#997b50]" /><p className="text-xs font-semibold text-[#6e5b43]">Your pace. Your privacy.</p><p className="mt-2 text-[11px] leading-relaxed text-[#95846e]">Contact details stay private until you choose to connect.</p></div>
          </div>

          {/* RIGHT PROFILE GRID (9-Columns) */}
          <section className="lg:col-span-9 space-y-5" aria-label="Match results" aria-busy={fetching}>
            <div className="flex items-center justify-between border-b border-[#e8e1d8] pb-4"><h2 className="text-sm font-semibold text-[#54463c]">{sortByFilter === "recommended" ? "Selected for you" : "Explore profiles"}</h2><span className="hidden text-[11px] text-[#9a8b7e] sm:block">{sortByFilter === "recommended" ? "Based on your preferences" : "Your filters, your choice"}</span><span className="text-xs text-[#9a8b7e] sm:hidden">{totalItems} profiles</span></div>
            {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{loadError}<button onClick={fetchDashboardData} className="ml-3 underline">Try again</button></div>}
            
            {fetching ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-5 animate-pulse">
                      <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-4" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : loadError ? null : candidates.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 max-w-lg mx-auto shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">No matches here yet</h4>
                <p className="text-sm font-light text-slate-500 leading-relaxed">
                  Try another city or clear your search filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGenderFilter("");
                    setCasteFilter("");
                    setReligionFilter("");
                    setDegreeFilter("");
                    setNriFilter(false);
                    setLocationFilter("");
                  setSearch("");
                    setMinAgeFilter(18);
                    setMaxAgeFilter(70);
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {candidates.map((profile, index) => <MatchCard
                    key={profile.userId}
                    profile={profile}
                    rank={sortByFilter === "recommended" ? (currentPage - 1) * pageSize + index + 1 : undefined}
                    unlocked={unlockedIds.includes(profile.userId)}
                    saved={favoriteIds.includes(profile.userId)}
                    pending={sentInterests.some(i => (i.receiverId || i.receiver_id) === profile.userId && i.status === "pending")}
                    accepted={sentInterests.some(i => (i.receiverId || i.receiver_id) === profile.userId && i.status === "accepted")}
                    busy={sendingInterest}
                    onSave={() => toggleShortlist(profile.userId)}
                    onInterest={() => handleExpressInterest(profile.userId)}
                    onUnlock={() => unlockedIds.includes(profile.userId) ? router.push(`/profile?id=${profile.userId}`) : triggerUnlock(profile)}
                    onAstro={() => checkAstrologyCompatibility(profile)}
                  />)}
                </div>

                {/* PAGINATION PANEL */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50]}
                />
              </div>
            )}

          </section>

        </div>

      </div>

      {/* CONFIRM UNLOCK MODAL DIALOG */}
      {showConfirmModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[28px] shadow-2xl max-w-md w-full text-center space-y-6 animate-scale-in relative">
            
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-maroon-50 dark:bg-maroon-950/20 text-maroon-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-maroon-100">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Unlock contact?</h3>
              <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
                View the phone number and email for {getProfileDisplayName(selectedProfile)}. This uses one contact credit.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 flex justify-between">
              <span>Available credits</span>
              <span className="text-gold-600 font-bold">{unlockBalance} Unlocks Remaining</span>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                fullWidth
                size="md"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                size="md"
                loading={unlocking}
                onClick={handleConfirmUnlock}
              >
                Confirm Unlock
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Contact details stay private
            </div>

          </div>
        </div>
      )}

      {/* ASTRO COMPATIBILITY & MEDIATION MODAL OVERLAY */}
      {showAstroModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[36px] shadow-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto space-y-6">
            
            <button
              onClick={() => setShowAstroModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Tab Header */}
            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 dark:bg-amber-950/20 border border-amber-200 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Premium Astrology & Mediation
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {showMediationForm ? "Assisted Family Mediation" : "Indicative Astrology Match"}
              </h3>
              <p className="text-xs font-light text-slate-500 max-w-sm mx-auto">
                Facilitating elite relationships through pure Vedic wisdom & dedicated family mediation.
              </p>
            </div>

            {/* Tab navigation within modal */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold border border-slate-200/50 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowMediationForm(false)}
                className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
                  !showMediationForm
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500"
                }`}
              >
                Horoscope Compatibility
              </button>
              <button
                type="button"
                disabled={!unlockedIds.includes(selectedProfile.userId)}
                onClick={() => setShowMediationForm(true)}
                className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  showMediationForm
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500"
                }`}
                title={!unlockedIds.includes(selectedProfile.userId) ? "Unlock contact details to request mediation!" : ""}
              >
                Request Family Mediation
              </button>
            </div>

            {/* Tab 1 Content: Astro Compatibility */}
            {!showMediationForm && (
              <div className="space-y-6">
                
                {/* Profiles side-by-side display */}
                <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <div className="text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Your Profile</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate block">
                      {dbUser?.highestDegree?.includes("CA") ? "Verified CA" : "You"}
                    </span>
                    <span className="text-[10px] text-maroon-500 dark:text-gold-500 font-bold block">
                      Rasi: {dbUser?.rasi || "Aries (Mesha)"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-light block">
                      Star: {dbUser?.nakshatram || "Krittika"}
                    </span>
                  </div>

                  <div className="text-center space-y-1 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Match Profile</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate block">
                      {selectedProfile.occupation.split(",")[0]}
                    </span>
                    <span className="text-[10px] text-maroon-500 dark:text-gold-500 font-bold block">
                      Rasi: {selectedProfile.highestDegree.includes("CS") ? "Leo (Simha)" : "Taurus (Vrishabha)"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-light block">
                      Star: {selectedProfile.highestDegree.includes("CS") ? "Uttara Phalguni" : "Rohini"}
                    </span>
                  </div>
                </div>

                {/* Locked Preview State */}
                {!unlockedIds.includes(selectedProfile.userId) ? (
                  <div className="text-center p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-4">
                    <Lock className="w-8 h-8 text-gold-500 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Kundali Details Guarded</h4>
                      <p className="text-xs font-light text-slate-500 leading-relaxed max-w-sm mx-auto">
                        Astro alignment uses rasi, nakshatra, and manglik fields when available. This is an indicative score — not a certified Vedic Ashtakoota report.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowAstroModal(false);
                        triggerUnlock(selectedProfile);
                      }}
                      className="text-xs flex items-center justify-center gap-1.5 mx-auto bg-gold-600 hover:bg-gold-700 text-slate-950"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Unlock Candidate Profile
                    </Button>
                  </div>
                ) : (
                  // Active Match Score view
                  astroResult && (
                    <div className="space-y-6">
                      
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              className="stroke-slate-100 dark:stroke-slate-800"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              className="stroke-gold-500"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={351.8}
                              strokeDashoffset={351.8 - (351.8 * (astroResult.score / 100))}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{astroResult.score}%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">match</span>
                          </div>
                        </div>

                        <div className="text-center space-y-0.5">
                          <span className="text-sm font-extrabold text-gold-600 block">
                            {astroResult.tier}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-light">
                            {astroResult.disclaimer ||
                              "Indicative community match only — not a Vedic Ashtakoota / certified horoscope report."}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compatibility parameters details</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {astroResult.details.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex justify-between items-start gap-2">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{item.name}</span>
                                <span className="text-[11px] text-slate-400 block font-light leading-snug">{item.desc}</span>
                              </div>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-700 px-2 py-0.5 rounded-lg shrink-0">
                                {item.score} / {item.max}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Call to action mediation button */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4">
                        <div className="text-left space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Want to schedule a match meeting?</span>
                          <p className="text-[10px] text-slate-400 font-light">Let our verified Relationship Managers introduce the families.</p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowMediationForm(true)}
                          className="text-xs font-bold shrink-0 bg-maroon-500 hover:bg-maroon-600 flex items-center gap-1"
                        >
                          <ChevronRight className="w-4 h-4" /> Request Mediation
                        </Button>
                      </div>

                    </div>
                  )
                )}

              </div>
            )}

            {/* Tab 2 Content: Mediation Request Form */}
            {showMediationForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!mediationDate || !mediationTime) return;
                  setSubmittingMediation(true);
                  
                  try {
                    const res = await createMediationRequest(
                      user!.uid,
                      selectedProfile.userId,
                      mediationDate,
                      mediationTime,
                      mediationNote
                    );

                    if (res.success) {
                      setShowAstroModal(false);
                      setMediationNote("");
                      addToast("success", "Mediation Requested", "Request dispatched successfully! relationship manager will call you shortly.");
                    } else {
                      addToast("error", "Error", res.error || "Failed to submit mediation request.");
                    }
                          } catch (err) {
                    console.error("Mediation save failed:", err);
                    addToast("error", "Network Error", "Could not submit mediation request.");
                  } finally {
                    setSubmittingMediation(false);
                  }
                }}
                className="space-y-4"
              >
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-light text-slate-500 leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="w-[1.125rem] h-[1.125rem] text-emerald-500" /> Premium Mediation Protocol
                  </div>
                  <p>
                    CA Matrimony BNCN provides highly confidential, assisted relationship mediation. Our Relationship Managers will reach out to both families to verify match interests, exchange horoscopes, and facilitate a secure intro phone call.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Convenient Date <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={mediationDate}
                      onChange={(e) => setMediationDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-maroon-500/50 text-slate-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Convenient Time <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={mediationTime}
                      onChange={(e) => setMediationTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-maroon-500/50 text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Personal note or instruction for Relationship Manager
                  </label>
                  <textarea
                    rows={3}
                    value={mediationNote}
                    onChange={(e) => setMediationNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs focus:outline-none text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Please speak with their family. We are Smartha Brahmins and would like to match horoscopes formally."
                  />
                </div>

                <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => setShowMediationForm(false)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    size="md"
                    className="bg-maroon-500 hover:bg-maroon-600"
                  >
                    Submit Mediation Request
                  </Button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}
    </MemberShell>
  );
}
