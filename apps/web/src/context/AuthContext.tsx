"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from "firebase/auth";
import { auth, googleProvider } from "@camatrimony/auth/client";
import { getProfile, updateProfile, setAuthTokenGetter } from "@camatrimony/api-client";
import { normalizePhoneNumber, stashAuthNextFromUrl } from "@/lib/auth-errors";
import { hasReviewSession, isLocalReview, REVIEW_SESSION_KEY, REVIEW_USER_ID } from "@/lib/local-review";

export interface DBUserProfile {
  fullName: string;
  profileCreatedBy: string;
  gender: string;
  diet: string;
  age: number;
  height: string;
  weight: number;
  maritalStatus: string;
  motherTongue: string;
  religion: string;
  caste: string;
  subcaste: string;
  gothram: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  rasi: string;
  nakshatram: string;
  kujaDosham: string;
  physicalStatus: string;
  highestDegree: string;
  employedIn: string;
  occupation: string;
  annualIncome: string;
  workLocation: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isNri: boolean;
  familyStatus: string;
  familyType: string;
  familyValues: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblingCount: number;
  partnerAgeRange: string;
  partnerCaste: string;
  partnerEducation: string;
  partnerIncomeMin: string;
  isOnboardingCompleted: boolean;
  completionPercentage: number;
  govtIdFile?: string;
  degreeFile?: string;
  photos?: string[];
  paymentProofUrl?: string;
  role?: string;
  aboutMe?: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DBUserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginForReview: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, containerId: string) => Promise<boolean>;
  confirmOTP: (otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<DBUserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Normalize API/local profile shapes (camelCase + snake_case dual reads). */
function filledStr(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : !!value;
}

function resolveOnboardingCompleted(raw: any): boolean {
  const flagged =
    raw.isOnboardingCompleted === true ||
    raw.is_onboarding_completed === 1 ||
    raw.is_onboarding_completed === true;
  if (flagged) return true;

  // Legacy: docs + photos + core fields — never bare ≥70%
  const photos: string[] = Array.isArray(raw.photos) ? raw.photos : [];
  const hasDocs =
    filledStr(raw.govtIdFile ?? raw.govt_id_file) &&
    filledStr(raw.degreeFile ?? raw.degree_file) &&
    photos.length >= 2;
  const hasCore =
    filledStr(raw.fullName ?? raw.full_name) &&
    filledStr(raw.gender) &&
    !!(raw.age && Number(raw.age) > 0) &&
    filledStr(raw.highestDegree ?? raw.highest_degree) &&
    filledStr(raw.occupation) &&
    filledStr(raw.workLocation ?? raw.work_location) &&
    filledStr(raw.caste);
  return hasDocs && hasCore;
}

function normalizeDbUser(raw: any): DBUserProfile {
  const completionPercentage =
    raw.completionPercentage ?? raw.completion_percentage ?? 0;
  const isOnboardingCompleted = resolveOnboardingCompleted(raw);

  return {
    fullName: raw.fullName ?? raw.full_name ?? "",
    profileCreatedBy: raw.profileCreatedBy ?? raw.profile_created_by ?? "Self",
    gender: raw.gender ?? "",
    diet: raw.diet ?? "Vegetarian",
    age: Number(raw.age) || 0,
    height: raw.height ?? "",
    weight: Number(raw.weight) || 0,
    maritalStatus: raw.maritalStatus ?? raw.marital_status ?? "Never Married",
    motherTongue: raw.motherTongue ?? raw.mother_tongue ?? "",
    religion: raw.religion ?? "Hindu",
    caste: raw.caste ?? "",
    subcaste: raw.subcaste ?? "",
    gothram: raw.gothram ?? "",
    birthDate: raw.birthDate ?? raw.birth_date ?? "",
    birthTime: raw.birthTime ?? raw.birth_time ?? "",
    birthPlace: raw.birthPlace ?? raw.birth_place ?? "",
    rasi: raw.rasi ?? "",
    nakshatram: raw.nakshatram ?? "",
    kujaDosham: raw.kujaDosham ?? raw.kuja_dosham ?? "No",
    physicalStatus: raw.physicalStatus ?? raw.physical_status ?? "Normal",
    highestDegree: raw.highestDegree ?? raw.highest_degree ?? "",
    employedIn: raw.employedIn ?? raw.employed_in ?? "",
    occupation: raw.occupation ?? "",
    annualIncome: raw.annualIncome ?? raw.annual_income ?? "",
    workLocation: raw.workLocation ?? raw.work_location ?? "",
    address: raw.address ?? "",
    city: raw.city ?? "",
    state: raw.state ?? "",
    country: raw.country ?? "India",
    isNri: Boolean(raw.isNri ?? raw.is_nri === 1),
    familyStatus: raw.familyStatus ?? raw.family_status ?? "",
    familyType: raw.familyType ?? raw.family_type ?? "",
    familyValues: raw.familyValues ?? raw.family_values ?? "",
    fatherOccupation: raw.fatherOccupation ?? raw.father_occupation ?? "",
    motherOccupation: raw.motherOccupation ?? raw.mother_occupation ?? "",
    siblingCount: Number(raw.siblingCount ?? raw.sibling_count ?? 0) || 0,
    partnerAgeRange: raw.partnerAgeRange ?? raw.partner_age_range ?? "",
    partnerCaste: raw.partnerCaste ?? raw.partner_caste ?? "",
    partnerEducation: raw.partnerEducation ?? raw.partner_education ?? "",
    partnerIncomeMin: raw.partnerIncomeMin ?? raw.partner_income_min ?? "",
    isOnboardingCompleted,
    completionPercentage,
    govtIdFile: raw.govtIdFile ?? raw.govt_id_file,
    degreeFile: raw.degreeFile ?? raw.degree_file,
    photos: raw.photos || [],
    paymentProofUrl: raw.paymentProofUrl ?? raw.payment_proof_url,
    role: raw.role,
    aboutMe: raw.aboutMe ?? raw.about_me,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  /** Keep a single RecaptchaVerifier; recreating without clear() breaks invisible reCAPTCHA. */
  const recaptchaVerifierRef = React.useRef<RecaptchaVerifier | null>(null);

  const clearRecaptchaVerifier = (containerId?: string) => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // Already cleared / container unmounted
      }
      recaptchaVerifierRef.current = null;
    }
    if (containerId && typeof document !== "undefined") {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    }
  };

  const syncProfile = async (uid: string) => {
    try {
      const res = await getProfile();
      if (res.success && res.data) {
        setDbUser(normalizeDbUser(res.data));
        return;
      }
    } catch (err) {
      console.warn("Profile API sync failed, falling back to LocalStorage:", err);
    }

    const localProfile = localStorage.getItem(`profile_${uid}`);
    if (localProfile) {
      try {
        setDbUser(normalizeDbUser(JSON.parse(localProfile)));
      } catch {
        setDbUser(null);
      }
    } else {
      setDbUser(null);
    }
  };

  useEffect(() => {
    setAuthTokenGetter(async (opts) => {
      if (hasReviewSession()) return REVIEW_USER_ID;
      try {
        if (typeof window !== "undefined" && auth?.currentUser) {
          const force = opts?.forceRefresh === true;
          try {
            return await auth.currentUser.getIdToken(force);
          } catch {
            if (force) {
              return await auth.currentUser.getIdToken(false);
            }
          }
        }
      } catch {
        // ignore — caller treats null as "Please log in again"
      }
      return null;
    });

    if (hasReviewSession()) {
      setUser({ uid: REVIEW_USER_ID, displayName: "Arjun Rao", email: "arjun@example.test", phoneNumber: null } as User);
      void syncProfile(REVIEW_USER_ID).finally(() => setLoading(false));
      return;
    }
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Complete Google redirect sign-in if we returned from signInWithRedirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (cancelled || !result?.user) return;
        await syncProfile(result.user.uid);
      })
      .catch((err) => {
        console.warn("Google redirect result failed:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(currentUser.uid);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const loginForReview = async () => {
    if (!isLocalReview()) throw new Error("Review login is only available locally.");
    setLoading(true);
    try {
      localStorage.setItem(REVIEW_SESSION_KEY, REVIEW_USER_ID);
      const res = await getProfile();
      if (!res.success || !res.data) throw new Error("Local review data is unavailable. Restart the review server.");
      setDbUser(normalizeDbUser(res.data));
      setUser({ uid: REVIEW_USER_ID, displayName: "Arjun Rao", email: "arjun@example.test", phoneNumber: null } as User);
    } catch (error) {
      localStorage.removeItem(REVIEW_SESSION_KEY);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    if (!auth || !googleProvider) {
      setLoading(false);
      throw new Error("Authentication service is not initialized.");
    }
    try {
      stashAuthNextFromUrl();
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncProfile(result.user.uid);
      }
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: string }).code || "")
          : "";
      // Popup blocked (common on mobile / strict browsers) → full-page redirect
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          stashAuthNextFromUrl();
          await signInWithRedirect(auth, googleProvider);
          // Navigation away — leave loading true
          return;
        } catch (redirectErr) {
          console.error("Google redirect Auth failed: ", redirectErr);
          throw redirectErr;
        }
      }
      console.error("Google Auth failed: ", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPhone = async (phoneNumber: string, containerId: string): Promise<boolean> => {
    setLoading(true);
    if (!auth) {
      setLoading(false);
      throw new Error("Authentication service is not initialized.");
    }

    const e164 = normalizePhoneNumber(phoneNumber);
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      setLoading(false);
      throw Object.assign(new Error("Invalid phone number"), {
        code: "auth/invalid-phone-number",
      });
    }

    try {
      // Always reset before a new send — stale verifiers cause captcha / send failures.
      clearRecaptchaVerifier(containerId);

      if (typeof document !== "undefined" && !document.getElementById(containerId)) {
        throw Object.assign(new Error("reCAPTCHA container missing"), {
          code: "auth/argument-error",
        });
      }

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {
          // Solved — signInWithPhoneNumber continues
        },
        "expired-callback": () => {
          clearRecaptchaVerifier(containerId);
        },
      });
      recaptchaVerifierRef.current = verifier;

      const result = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmationResult(result);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Phone Auth initiate failed: ", err);
      clearRecaptchaVerifier(containerId);
      setConfirmationResult(null);
      setLoading(false);
      throw err;
    }
  };

  const confirmOTP = async (otpCode: string) => {
    setLoading(true);
    try {
      if (!confirmationResult) {
        throw new Error("No active OTP confirmation result exists.");
      }
      const result = await confirmationResult.confirm(otpCode);
      if (result.user) {
        await syncProfile(result.user.uid);
      }
    } catch (err) {
      console.error("OTP confirm failed: ", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if (hasReviewSession()) {
      localStorage.removeItem(REVIEW_SESSION_KEY);
      setUser(null);
      setDbUser(null);
      setLoading(false);
      return;
    }
    if (!auth) {
      setLoading(false);
      throw new Error("Authentication service is not initialized.");
    }
    const uid = user?.uid;
    try {
      clearRecaptchaVerifier();
      setConfirmationResult(null);
      await signOut(auth);
      setUser(null);
      setDbUser(null);
      if (typeof window !== "undefined" && uid) {
        localStorage.removeItem(`onboarding_wizard_progress_${uid}`);
        localStorage.removeItem("onboarding_wizard_progress"); // legacy unscoped key
      }
    } catch (err) {
      console.error("Signout failed: ", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = async (data: Partial<DBUserProfile>) => {
    if (!user) {
      throw new Error("Not authenticated");
    }
    const uid = user.uid;

    const updatedProfile = normalizeDbUser({
      ...dbUser,
      ...data,
      isOnboardingCompleted: data.isOnboardingCompleted ?? dbUser?.isOnboardingCompleted ?? false,
      completionPercentage: data.completionPercentage ?? dbUser?.completionPercentage ?? 0,
    });

    const res = await updateProfile({
      ...updatedProfile,
      email: user.email,
      phone: user.phoneNumber,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to save profile");
    }

    // Prefer server-normalized profile when returned
    const saved = res.data ? normalizeDbUser({ ...updatedProfile, ...res.data }) : updatedProfile;
    localStorage.setItem(`profile_${uid}`, JSON.stringify(saved));
    setDbUser(saved);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        loginWithGoogle,
        loginForReview,
        loginWithPhone,
        confirmOTP,
        logout,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be called inside an AuthProvider component.");
  }
  return context;
}
