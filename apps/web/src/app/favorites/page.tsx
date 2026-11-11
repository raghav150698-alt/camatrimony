"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Heart, 
  Trash2, 
  Unlock, 
  Lock,
  Phone, 
  Mail, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@camatrimony/ui";
import { Badge } from "@camatrimony/ui";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import { ConfirmDialog } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  getFavorites,
  removeFavorite,
  getUnlocks,
  unlockContact,
  getSubscription,
} from "@camatrimony/api-client";

export default function FavoritesPage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core state
  const [favorites, setFavorites] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [unlockBalance, setUnlockBalance] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Interactive controls
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchFavoritesAndUnlocks = async () => {
    if (!user) return;
    setFetching(true);
    try {
      // 1. Fetch favorites
      const favRes = await getFavorites(user.uid);
      if (favRes.success && favRes.data) {
        const validFavs = (favRes.data as any[]).filter((f: any) => (f.favoritedUserId || f.user_id) !== null);
        setFavorites(validFavs);
      }

      // 2. Fetch unlocks + subscription in the same tick (no stale balance)
      const [unlocksRes, subRes] = await Promise.all([
        getUnlocks(user.uid),
        getSubscription().catch(() => ({ success: false as const, data: null })),
      ]);

      let usedUnlocks = 0;
      if (unlocksRes.success && unlocksRes.data) {
        const ids = (unlocksRes.data as any[]).map((un: any) => un.unlockedUserId || un.unlocked_user_id);
        usedUnlocks = ids.length;
        setUnlockedIds(ids);
      }

      if (subRes.success && subRes.data && subRes.data.isActive) {
        const sub = subRes.data as any;
        if (sub.contactLimitBalance != null || sub.contact_limit_balance != null) {
          setUnlockBalance(Math.max(0, Number(sub.contactLimitBalance ?? sub.contact_limit_balance)));
        } else {
          const limit = Number(sub.contactLimit ?? sub.contact_limit ?? 20);
          setUnlockBalance(Math.max(0, limit - usedUnlocks));
        }
      } else {
        setUnlockBalance(0);
      }
    } catch (err) {
      console.error("Favorites fetch error", err);
      addToast("error", "Network Error", "Could not fetch shortlisted profiles.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFavoritesAndUnlocks();
    }
  }, [user, dbUser]);

  // Remove bookmark
  const handleRemoveFavorite = async (favoritedUserId: string) => {
    try {
      const res = await removeFavorite(user!.uid, favoritedUserId);
      if (res.success) {
        setFavorites(prev => prev.filter(f => (f.favoritedUserId || f.user_id) !== favoritedUserId));
        addToast("success", "Shortlist Updated", "Candidate removed from your shortlist.");
      } else {
        addToast("error", "Error", res.error || "Failed to remove favorite.");
      }
    } catch (err) {
      addToast("error", "Network Error", "Failed to contact database.");
    }
  };

  // Unlock confirmation triggers
  const triggerUnlock = (profile: any) => {
    setSelectedProfile(profile);
    setShowConfirmModal(true);
  };

  const handleConfirmUnlock = async () => {
    if (!user || !selectedProfile) return;
    setUnlocking(true);

    try {
      const targetId = selectedProfile.favoritedUserId || selectedProfile.user_id;
      const res = await unlockContact(user.uid, targetId);

      if (res.success) {
        setUnlockedIds(prev => [...prev, targetId]);
        if (!(res.data as any)?.alreadyUnlocked) {
          setUnlockBalance(prev => Math.max(0, prev - 1));
        }
        setShowConfirmModal(false);
        addToast("success", "Contact Info Unlocked", `Credentials fully revealed for ${selectedProfile.occupation?.split(',')[0] || "candidate"}`);
      } else {
        addToast("error", "Unlock Failed", res.error || "Failed to unlock candidate.");
      }
    } catch (err) {
      addToast("error", "Network Error", "Failed to connect to unlocks backend.");
    } finally {
      setUnlocking(false);
    }
  };

  // Protect client route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/favorites")}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">Loading your shortlisted profiles...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        {/* HERO ACCENT BAR */}
        <PageHeader eyebrow="SAVED FOR LATER" title="Your saved profiles." description="The people you’d like to get to know."></PageHeader>

        {/* MAIN CATALOG GRID */}
        {fetching ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-maroon-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-semibold text-slate-400">Syncing shortlisted records...</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-8 max-w-lg mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Shortlist Empty</h4>
            <p className="text-sm font-light text-slate-500 leading-relaxed max-w-sm mx-auto">
              You haven't bookmarked any professional candidate profiles yet. Navigate back to the Match Catalog to add profiles.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-xs"
            >
              Explore Match Catalog <ArrowRight className="w-4 h-4 ml-1.5 inline" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((profile) => {
              const isUnlocked = unlockedIds.includes(profile.user_id);
              const photosList = profile.photos || [];
              const hasPhoto = photosList.length > 0;
              const photoSrc = isUnlocked 
                ? (hasPhoto ? photosList[0] : "/avatar-placeholder.svg") 
                : "/avatar-placeholder.svg";

              return (
                <div
                  key={profile.user_id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-md flex flex-col h-full relative group transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Photo area */}
                  <div className="relative aspect-square w-full bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center overflow-hidden">
                    <img 
                      src={photoSrc} 
                      className={`w-full h-full object-contain p-3 ${!isUnlocked ? "blur-md" : ""}`}
                      alt="" 
                    />

                    {/* ID Verified badge */}
                    {profile.is_verified === 1 && (
                      <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ID Verified
                      </div>
                    )}

                    {/* Qualification specialty badge */}
                    <div className="absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold-500 text-slate-950 font-extrabold text-[10px] shadow-md uppercase">
                      {profile.highest_degree?.includes("CA") ? "CA" : profile.highest_degree?.includes("CS") ? "CS" : "Elite"}
                    </div>

                    {/* Shortlist bookmark trash trigger */}
                    <button
                      onClick={() => handleRemoveFavorite(profile.user_id)}
                      className="absolute bottom-4 right-4 p-2.5 bg-white/95 dark:bg-slate-900/95 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-full shadow-md transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Lock Overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-white">
                        <Lock className="w-8 h-8 text-gold-500 mb-2" />
                        <span className="text-xs font-bold tracking-wider uppercase mb-1">Contact Locked</span>
                      </div>
                    )}
                  </div>

                  {/* Summary details card body */}
                  <div className="p-6 flex-grow flex flex-col space-y-4">
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 
                          onClick={() => router.push(`/profile?id=${profile.user_id}`)}
                          className="text-base font-extrabold text-slate-900 dark:text-white leading-tight hover:text-maroon-500 cursor-pointer"
                        >
                          {isUnlocked ? profile.occupation?.split(',')[0] : `CA Candidate #${profile.user_id.split("-")[2] || "772"}`}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">#{profile.user_id.split("-")[2] || "772"}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {profile.highest_degree}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs font-light text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-bold block text-[9px] text-slate-400 uppercase">Age / Height</span>
                        {profile.age} Yrs, {profile.height}
                      </div>
                      <div>
                        <span className="font-bold block text-[9px] text-slate-400 uppercase">Caste</span>
                        {profile.caste}
                      </div>
                      <div>
                        <span className="font-bold block text-[9px] text-slate-400 uppercase">Location</span>
                        {profile.work_location?.split(",")[0]} {profile.is_nri === 1 && <span className="text-gold-600 font-bold">(NRI)</span>}
                      </div>
                      <div>
                        <span className="font-bold block text-[9px] text-slate-400 uppercase">Annual Income</span>
                        {profile.annual_income}
                      </div>
                    </div>

                    {isUnlocked && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{profile.phone || "View full profile for contact"}</span>
                        </div>
                        <div className="flex items-center gap-2 break-all">
                          <Mail className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{profile.email || "View full profile for email"}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 mt-auto">
                      {isUnlocked ? (
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => router.push(`/profile?id=${profile.user_id}`)}
                          className="text-xs flex items-center justify-center gap-1.5"
                        >
                          View Full Profile <ArrowRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => triggerUnlock(profile)}
                            className="text-xs flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Unlock Contact Info
                          </Button>
                          <button
                            onClick={() => router.push(`/profile?id=${profile.user_id}`)}
                            className="text-[10px] font-semibold text-gold-600 hover:text-gold-700 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Preview Profile Details
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* CONFIRM PROFILE UNLOCK MODAL */}
      {showConfirmModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[36px] shadow-2xl max-w-md w-full text-center space-y-6 animate-scale-in relative">
            
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-16 h-16 bg-maroon-50 dark:bg-maroon-950/20 text-maroon-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-maroon-100">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Deduct 1 Unlock?</h3>
              <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed">
                Confirming will deduct 1 unlock balance credit to reveal direct numbers, star horoscopes, and media portfolios for candidate **#{selectedProfile.user_id.split("-")[2] || "772"}** ({selectedProfile.occupation?.split(",")[0]}).
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 flex justify-between">
              <span>BALANCE VIEW LIMITS:</span>
              <span className="text-gold-600 font-bold">{unlockBalance} Unlocks</span>
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
              Secure Match Unlock Engine
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}
