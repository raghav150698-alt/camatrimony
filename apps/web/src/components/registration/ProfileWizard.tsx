"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/auth-errors";
import { 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Upload,
  Sparkles,
  CheckCircle2,
  Lock,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";
import { useAuth, DBUserProfile } from "@/context/AuthContext";
import { Button, Select } from "@camatrimony/ui";
import { uploadFile } from "@camatrimony/api-client";
import {
  RASI_OPTIONS,
  NAKSHATRA_OPTIONS,
  KUJA_DOSHAM_OPTIONS,
  PROFILE_CREATED_BY_OPTIONS,
  DIET_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PHYSICAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  HIGHEST_DEGREE_OPTIONS,
  EMPLOYED_IN_OPTIONS,
  ANNUAL_INCOME_OPTIONS,
  FAMILY_STATUS_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  FAMILY_VALUES_OPTIONS,
  toSelectOptions,
  toAbsoluteMediaUrl,
  mediaFileDisplayName,
  validateUploadFile,
  isImageMediaUrl,
  DEFAULT_API_BASE_URL,
} from "@camatrimony/shared";

const UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

const TOTAL_STEPS = 7;
const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

function draftKey(uid: string) {
  return `onboarding_wizard_progress_${uid}`;
}

function absMedia(url: string | undefined | null): string {
  return toAbsoluteMediaUrl(url, API_BASE);
}

/** Defaults that match <select> option values — never leave selects with value="". */
const WIZARD_DEFAULTS: Partial<DBUserProfile> = {
  fullName: "",
  profileCreatedBy: "Self",
  gender: "Male",
  diet: "Vegetarian",
  age: 26,
  height: "5'8\"",
  weight: 70,
  maritalStatus: "Never Married",
  motherTongue: "Telugu",
  religion: "Hindu",
  caste: "",
  subcaste: "",
  gothram: "",
  birthDate: "",
  birthTime: "",
  birthPlace: "",
  rasi: "",
  nakshatram: "",
  kujaDosham: "No",
  physicalStatus: "Normal",
  highestDegree: "Chartered Accountant (CA)",
  employedIn: "Private Sector",
  occupation: "",
  annualIncome: "₹7 - ₹10 LPA",
  workLocation: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  isNri: false,
  familyStatus: "Upper-Middle Class",
  familyType: "Nuclear",
  familyValues: "Traditional",
  fatherOccupation: "",
  motherOccupation: "",
  siblingCount: 0,
  partnerAgeRange: "",
  partnerCaste: "Open to All",
  partnerEducation: "",
  partnerIncomeMin: "",
  govtIdFile: "",
  degreeFile: "",
  photos: [],
};

function isNonEmptyValue(key: string, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return false;
    // age/weight 0 from an empty API row should not wipe wizard defaults
    if (value === 0 && key !== "siblingCount") return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Merge incoming profile onto base without letting empty API strings wipe select defaults. */
function mergeWizardForm(
  base: Partial<DBUserProfile>,
  incoming?: Partial<DBUserProfile> | Record<string, unknown> | null
): Partial<DBUserProfile> {
  if (!incoming) return { ...base };
  const normalized = normalizeWizardKeys(incoming);
  const next: Partial<DBUserProfile> = { ...base };
  (Object.keys(normalized) as (keyof DBUserProfile)[]).forEach((key) => {
    const value = normalized[key];
    if (isNonEmptyValue(String(key), value)) {
      (next as Record<string, unknown>)[key] = value;
    }
  });
  return next;
}

/** Map legacy snake_case keys (API / old localStorage) onto camelCase wizard state. */
function normalizeWizardKeys(
  raw: Partial<DBUserProfile> | Record<string, unknown>
): Partial<DBUserProfile> {
  const r = raw as Record<string, unknown>;
  return {
    ...(raw as Partial<DBUserProfile>),
    fullName: (r.fullName ?? r.full_name) as string | undefined,
    profileCreatedBy: (r.profileCreatedBy ?? r.profile_created_by) as string | undefined,
    maritalStatus: (r.maritalStatus ?? r.marital_status) as string | undefined,
    motherTongue: (r.motherTongue ?? r.mother_tongue) as string | undefined,
    birthDate: (r.birthDate ?? r.birth_date) as string | undefined,
    birthTime: (r.birthTime ?? r.birth_time) as string | undefined,
    birthPlace: (r.birthPlace ?? r.birth_place) as string | undefined,
    kujaDosham: (r.kujaDosham ?? r.kuja_dosham) as string | undefined,
    physicalStatus: (r.physicalStatus ?? r.physical_status) as string | undefined,
    highestDegree: (r.highestDegree ?? r.highest_degree) as string | undefined,
    employedIn: (r.employedIn ?? r.employed_in) as string | undefined,
    annualIncome: (r.annualIncome ?? r.annual_income) as string | undefined,
    workLocation: (r.workLocation ?? r.work_location) as string | undefined,
    isNri: (r.isNri ?? (r.is_nri === 1 || r.is_nri === true)) as boolean | undefined,
    familyStatus: (r.familyStatus ?? r.family_status) as string | undefined,
    familyType: (r.familyType ?? r.family_type) as string | undefined,
    familyValues: (r.familyValues ?? r.family_values) as string | undefined,
    fatherOccupation: (r.fatherOccupation ?? r.father_occupation) as string | undefined,
    motherOccupation: (r.motherOccupation ?? r.mother_occupation) as string | undefined,
    siblingCount: (r.siblingCount ?? r.sibling_count) as number | undefined,
    partnerAgeRange: (r.partnerAgeRange ?? r.partner_age_range) as string | undefined,
    partnerCaste: (r.partnerCaste ?? r.partner_caste) as string | undefined,
    partnerEducation: (r.partnerEducation ?? r.partner_education) as string | undefined,
    partnerIncomeMin: (r.partnerIncomeMin ?? r.partner_income_min) as string | undefined,
    govtIdFile: (r.govtIdFile ?? r.govt_id_file) as string | undefined,
    degreeFile: (r.degreeFile ?? r.degree_file) as string | undefined,
    photos: (r.photos as string[] | undefined) ?? undefined,
    isOnboardingCompleted: (r.isOnboardingCompleted === true ||
      r.is_onboarding_completed === 1 ||
      r.is_onboarding_completed === true) as boolean | undefined,
    completionPercentage: (r.completionPercentage ?? r.completion_percentage) as
      | number
      | undefined,
  };
}

function filled(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value) && value > 0;
  return Boolean(value);
}

export default function ProfileWizard() {
  const { user, dbUser, updateProfileData } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [pendingUploadField, setPendingUploadField] = useState<"govtIdFile" | "degreeFile" | "photos" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [govtIdFileName, setGovtIdFileName] = useState<string>("");
  const [degreeFileName, setDegreeFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state: defaults first, then only non-empty dbUser fields (avoids empty selects looking filled)
  const [formData, setFormData] = useState<Partial<DBUserProfile>>(() =>
    mergeWizardForm(WIZARD_DEFAULTS, dbUser)
  );

  // When auth profile arrives after mount, fill blank fields only — never wipe user input with ""
  useEffect(() => {
    if (!dbUser) return;
    setFormData((prev) =>
      mergeWizardForm(prev, {
        ...dbUser,
        govtIdFile: absMedia(dbUser.govtIdFile) || dbUser.govtIdFile,
        degreeFile: absMedia(dbUser.degreeFile) || dbUser.degreeFile,
        photos: (dbUser.photos || []).map((p) => absMedia(p) || p),
      })
    );
  }, [dbUser]);

  // Restore wizard progress from localStorage scoped by uid (survives refresh)
  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid) return;
    const scoped = localStorage.getItem(draftKey(user.uid));
    const legacy = localStorage.getItem("onboarding_wizard_progress");
    const saved = scoped || legacy;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData((prev) => mergeWizardForm(prev, parsed.formData));
        }
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.govtIdFileName) setGovtIdFileName(parsed.govtIdFileName);
        if (parsed.degreeFileName) setDegreeFileName(parsed.degreeFileName);
        // Migrate legacy unscoped draft into uid-scoped key
        if (!scoped && legacy) {
          localStorage.setItem(draftKey(user.uid), saved);
          localStorage.removeItem("onboarding_wizard_progress");
        }
      } catch {
        // ignore corrupt saved state
      }
    }
  }, [user?.uid]);

  // Persist wizard progress to localStorage on every change (uid-scoped)
  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid) return;
    localStorage.setItem(
      draftKey(user.uid),
      JSON.stringify({ formData, currentStep, govtIdFileName, degreeFileName })
    );
  }, [formData, currentStep, govtIdFileName, degreeFileName, user?.uid]);

  // Calculate profile completion percentage based on crucial fields filled
  const percent = useMemo(() => {
    const importantFields: (keyof DBUserProfile)[] = [
      "fullName", "profileCreatedBy", "gender", "diet", "age", "height", "maritalStatus",
      "motherTongue", "religion", "caste", "birthDate", "birthPlace", "highestDegree",
      "employedIn", "occupation", "annualIncome", "workLocation", "city",
      "familyStatus", "familyType", "partnerAgeRange", "partnerEducation"
    ];
    
    let filledCount = 0;
    importantFields.forEach(field => {
      if (filled(formData[field])) {
        filledCount++;
      }
    });

    // Add extra weights for documents/photos
    if (filled(formData.govtIdFile)) filledCount += 1.5;
    if (filled(formData.degreeFile)) filledCount += 1.5;
    if (formData.photos && formData.photos.length >= 2) filledCount += 2;

    return Math.min(
      100, 
      Math.round((filledCount / (importantFields.length + 5)) * 100)
    );
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setStepError(null);
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === "age" || name === "weight" || name === "siblingCount") {
      const num = value === "" ? (name === "siblingCount" ? 0 : undefined) : Number(value);
      setFormData(prev => ({ ...prev, [name]: Number.isFinite(num as number) ? num : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openFilePicker = (field: "govtIdFile" | "degreeFile" | "photos") => {
    setUploadError(null);
    setStepError(null);
    setPendingUploadField(field);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = pendingUploadField;
    if (!file || !field) return;

    if (field === "photos" && (formData.photos?.length || 0) >= 10) {
      setUploadError("Maximum of 10 profile photos allowed.");
      setPendingUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const category = field === "photos" ? "photos" : field === "govtIdFile" ? "govt_id" : "degree";
    const precheck = validateUploadFile(file, category);
    if (precheck) {
      setUploadError(precheck);
      setPendingUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const res = await uploadFile(file, category);
      if (res.success && (res.data || (res as { url?: string }).url)) {
        const payload = (res.data || res) as { url?: string; fileName?: string };
        const url = absMedia(payload.url) || payload.url;
        if (!url) throw new Error("The upload did not return a file URL.");
        if (field === "photos") {
          setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), url] }));
        } else {
          setFormData(prev => ({ ...prev, [field]: url }));
          if (field === "govtIdFile") setGovtIdFileName(payload.fileName || res.data?.fileName || file.name);
          if (field === "degreeFile") setDegreeFileName(payload.fileName || res.data?.fileName || file.name);
        }
        setUploadError(null);
        setStepError(null);
      } else {
        const msg = res.error || "Could not upload file.";
        const lower = msg.toLowerCase();
        if (
          lower.includes("unauthorized") ||
          lower.includes("authentication required") ||
          lower.includes("log in again")
        ) {
          setUploadError("Your session expired. Please log in again, then retry the upload.");
        } else {
          setUploadError(msg);
        }
      }
    } catch (err) {
      setUploadError("Failed to connect to upload service.");
    } finally {
      setPendingUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNext = () => {
    // Validators must read the same camelCase keys the inputs write
    if (currentStep === 1 && !filled(formData.gender)) {
      setStepError("Please select your gender to continue.");
      return;
    }
    if (currentStep === 1 && !filled(formData.fullName)) {
      setStepError("Please enter the candidate's full name.");
      return;
    }
    if (currentStep === 2) {
      const age = Number(formData.age);
      if (!filled(formData.height) || !Number.isFinite(age)) {
        setStepError("Age and height are required.");
        return;
      }
      if (age < 18 || age > 70) {
        setStepError("Age must be between 18 and 70.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        age,
        weight: Number(prev.weight) || 0,
      }));
    }
    if (currentStep === 3 && (!filled(formData.religion) || !filled(formData.caste))) {
      setStepError("Religion and caste are required.");
      return;
    }
    if (currentStep === 5) {
      // Coerce select defaults into state — controlled selects can look filled while value is ""
      const highestDegree = filled(formData.highestDegree)
        ? String(formData.highestDegree).trim()
        : (WIZARD_DEFAULTS.highestDegree as string);
      const employedIn = filled(formData.employedIn)
        ? String(formData.employedIn).trim()
        : (WIZARD_DEFAULTS.employedIn as string);
      const annualIncome = filled(formData.annualIncome)
        ? String(formData.annualIncome).trim()
        : (WIZARD_DEFAULTS.annualIncome as string);
      const occupation = String(formData.occupation || "").trim();
      const workLocation = String(formData.workLocation || "").trim();

      if (!occupation || !workLocation) {
        setStepError("Occupation and work city are required.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        highestDegree,
        employedIn,
        annualIncome,
        occupation,
        workLocation,
      }));
    }
    if (currentStep === 6) {
      setFormData((prev) => ({
        ...prev,
        siblingCount: Number(prev.siblingCount) || 0,
      }));
    }
    if (currentStep === TOTAL_STEPS) {
      if (pendingUploadField) {
        setStepError("Please wait for the upload to finish.");
        return;
      }
      if (!filled(formData.govtIdFile) || !filled(formData.degreeFile)) {
        setStepError("Government ID and degree certificate uploads are required.");
        return;
      }
      if (!formData.photos || formData.photos.length < 2) {
        setStepError("Please upload at least 2 profile photos.");
        return;
      }
    }

    setStepError(null);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      void handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStepError(null);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting || pendingUploadField) return;
    setSubmitting(true);
    setStepError(null);
    try {
      await updateProfileData({
        ...formData,
        age: Number(formData.age) || 0,
        weight: Number(formData.weight) || 0,
        siblingCount: Number(formData.siblingCount) || 0,
        govtIdFile: absMedia(formData.govtIdFile) || formData.govtIdFile,
        degreeFile: absMedia(formData.degreeFile) || formData.degreeFile,
        photos: (formData.photos || []).map((p) => absMedia(p) || p),
        isOnboardingCompleted: true,
        completionPercentage: percent,
      });
      setSuccess(true);
      if (typeof window !== "undefined" && user?.uid) {
        localStorage.removeItem(draftKey(user.uid));
        localStorage.removeItem("onboarding_wizard_progress");
      }
      setTimeout(() => {
        router.push(resolvePostAuthPath(true));
      }, 3000);
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : "Could not save profile. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [
    "Account Creator",
    "Candidate Bio",
    "Cultural Details",
    "Astrology Specs",
    "Career & Income",
    "Family Context",
    "Proofs & Photos"
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {success ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 rounded-[36px] shadow-2xl text-center space-y-6 animate-scale-in">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-gold-500 animate-spin" /> Profile Created!
            </h2>
            <p className="text-sm font-light text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Your elite matrimonial profile has been cached successfully. We are now running manual verification audits. Redirecting to catalog...
            </p>
          </div>
          <div className="flex justify-center items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            100% ID Audit Enforced
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[36px] shadow-2xl overflow-hidden">
          
          {/* Wizard Header Banner */}
          <div className="bg-gradient-to-tr from-maroon-900 via-maroon-700 to-maroon-950 p-8 text-white relative">
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/15">
              Completion: {percent}%
            </div>
            
            <div className="flex gap-2.5 items-center mb-1 text-gold-500">
              <Sparkles className="w-5 h-5 text-gold-500" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Stepping Stone Registration</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Onboarding Profile</h2>
            <p className="text-xs text-maroon-100 font-light mt-1">
              Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]}
            </p>

            {/* Stepper Progress bar */}
            <div
              className="w-full bg-white/15 h-2 rounded-full mt-6 relative overflow-hidden"
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={`Step ${currentStep} of ${TOTAL_STEPS}`}
            >
              <div 
                className="bg-gold-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Layers container */}
          <div className="p-8 space-y-6">
            
            {/* STEP 1: ACCOUNT CREATOR */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Candidate Full Name <span className="text-maroon-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName || ""}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder="As on government ID"
                    required
                  />
                </div>

                <Select
                  id="profileCreatedBy"
                  name="profileCreatedBy"
                  label="Profile Managed By"
                  labelStyle="wizard"
                  fieldSize="compact"
                  required
                  value={formData.profileCreatedBy}
                  onChange={handleChange}
                  options={PROFILE_CREATED_BY_OPTIONS}
                  placeholder={false}
                />

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                    Your Gender <span className="text-maroon-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {["Male", "Female"].map(gen => (
                      <button
                        key={gen}
                        type="button"
                        onClick={() => {
                          setStepError(null);
                          setFormData(p => ({ ...p, gender: gen }));
                        }}
                        className={`py-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                          formData.gender === gen
                            ? "bg-maroon-500 border-transparent text-white shadow-md shadow-maroon-500/20"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {gen}
                      </button>
                    ))}
                  </div>
                </div>

                <Select
                  id="diet"
                  name="diet"
                  label="Dietary Habits"
                  labelStyle="wizard"
                  fieldSize="compact"
                  value={formData.diet}
                  onChange={handleChange}
                  options={DIET_OPTIONS}
                  placeholder={false}
                />
              </div>
            )}

            {/* STEP 2: CANDIDATE BIO */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Age (Years) <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      min={18}
                      max={70}
                      required
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. 26"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Height <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="height"
                      required
                      value={formData.height}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. 5ft 8in"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Weight (Kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. 68"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Select
                      id="maritalStatus"
                      name="maritalStatus"
                      label="Marital Status"
                      labelStyle="wizard"
                      fieldSize="compact"
                      required
                      value={formData.maritalStatus}
                      onChange={handleChange}
                      options={MARITAL_STATUS_OPTIONS}
                      placeholder={false}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Mother Tongue
                    </label>
                    <input
                      type="text"
                      name="motherTongue"
                      value={formData.motherTongue || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Telugu, Tamil, Hindi"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Select
                      id="physicalStatus"
                      name="physicalStatus"
                      label="Physical Status"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.physicalStatus || "Normal"}
                      onChange={handleChange}
                      options={PHYSICAL_STATUS_OPTIONS}
                      placeholder={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CULTURAL DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Select
                      id="religion"
                      name="religion"
                      label="Religion"
                      labelStyle="wizard"
                      fieldSize="compact"
                      required
                      value={formData.religion}
                      onChange={handleChange}
                      options={RELIGION_OPTIONS}
                      placeholder={false}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Caste <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="caste"
                      required
                      value={formData.caste}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Brahmin, Reddy, Kamma..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Subcaste (Optional)
                    </label>
                    <input
                      type="text"
                      name="subcaste"
                      value={formData.subcaste}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Madhwa, Smartha"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Gothram
                    </label>
                    <input
                      type="text"
                      name="gothram"
                      value={formData.gothram}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Bharadwaja, Kasyapa"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ASTROLOGY DETAILS */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Birth Time
                    </label>
                    <input
                      type="time"
                      name="birthTime"
                      value={formData.birthTime}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Birth Place
                  </label>
                  <input
                    type="text"
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder="e.g. Hyderabad, Telangana"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    {(formData.religion || "Hindu").toLowerCase().includes("hindu") ? (
                      <Select
                        id="rasi"
                        name="rasi"
                        label="Rasi (Moon Sign)"
                        labelStyle="wizard"
                        fieldSize="compact"
                        value={formData.rasi || ""}
                        onChange={handleChange}
                        options={toSelectOptions(RASI_OPTIONS)}
                        placeholder="Select Rasi"
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Rasi (Moon Sign)
                        </label>
                        <input
                          type="text"
                          name="rasi"
                          value={formData.rasi}
                          onChange={handleChange}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                          placeholder="Optional"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    {(formData.religion || "Hindu").toLowerCase().includes("hindu") ? (
                      <Select
                        id="nakshatram"
                        name="nakshatram"
                        label="Star (Nakshatram)"
                        labelStyle="wizard"
                        fieldSize="compact"
                        value={formData.nakshatram || ""}
                        onChange={handleChange}
                        options={toSelectOptions(NAKSHATRA_OPTIONS)}
                        placeholder="Select Nakshatra"
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Star (Nakshatram)
                        </label>
                        <input
                          type="text"
                          name="nakshatram"
                          value={formData.nakshatram}
                          onChange={handleChange}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                          placeholder="Optional"
                        />
                      </div>
                    )}
                  </div>
                  <Select
                    id="kujaDosham"
                    name="kujaDosham"
                    label="Chevvai / Manglik"
                    labelStyle="wizard"
                    fieldSize="compact"
                    value={formData.kujaDosham}
                    onChange={handleChange}
                    options={toSelectOptions(KUJA_DOSHAM_OPTIONS)}
                    placeholder={false}
                  />
                </div>
                {(formData.religion || "Hindu").toLowerCase().includes("hindu") && (
                  <p className="text-[11px] text-slate-400">
                    Astrology fields use standard India lists for matching. Match % is indicative only — not a certified Vedic report.
                  </p>
                )}
              </div>
            )}

            {/* STEP 5: CAREER & INCOME */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-fadeIn">
                <Select
                  id="highestDegree"
                  name="highestDegree"
                  label="Highest Qualification Degree"
                  labelStyle="wizard"
                  fieldSize="compact"
                  required
                  value={formData.highestDegree || "Chartered Accountant (CA)"}
                  onChange={handleChange}
                  options={HIGHEST_DEGREE_OPTIONS}
                  placeholder={false}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    id="employedIn"
                    name="employedIn"
                    label="Employed In"
                    labelStyle="wizard"
                    fieldSize="compact"
                    required
                    value={formData.employedIn || "Private Sector"}
                    onChange={handleChange}
                    options={EMPLOYED_IN_OPTIONS}
                    placeholder={false}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Occupation <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="occupation"
                      required
                      value={formData.occupation}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Audit Manager, Finance Lead"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    id="annualIncome"
                    name="annualIncome"
                    label="Annual Income (INR)"
                    labelStyle="wizard"
                    fieldSize="compact"
                    required
                    value={formData.annualIncome || "₹7 - ₹10 LPA"}
                    onChange={handleChange}
                    options={ANNUAL_INCOME_OPTIONS}
                    placeholder={false}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Current Work City <span className="text-maroon-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="workLocation"
                      required
                      value={formData.workLocation}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Mumbai, MH"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">City</label>
                    <input type="text" name="city" value={formData.city || ""} onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="City" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">State</label>
                    <input type="text" name="state" value={formData.state || ""} onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="State" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Country</label>
                    <input type="text" name="country" value={formData.country || "India"} onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="India" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Residential Address</label>
                  <input type="text" name="address" value={formData.address || ""} onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder="Street / locality (kept private)" />
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="checkbox"
                    id="isNri"
                    name="isNri"
                    checked={formData.isNri}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-200 text-maroon-500 focus:ring-maroon-500 cursor-pointer"
                  />
                  <label htmlFor="isNri" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer">
                    Candidate holds NRI (Non-Resident Indian) status
                  </label>
                </div>
              </div>
            )}

            {/* STEP 6: FAMILY PROFILE */}
            {currentStep === 6 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    id="familyStatus"
                    name="familyStatus"
                    label="Family Status"
                    labelStyle="wizard"
                    fieldSize="compact"
                    value={formData.familyStatus}
                    onChange={handleChange}
                    options={FAMILY_STATUS_OPTIONS}
                    placeholder={false}
                  />
                  <Select
                    id="familyType"
                    name="familyType"
                    label="Family Type"
                    labelStyle="wizard"
                    fieldSize="compact"
                    value={formData.familyType}
                    onChange={handleChange}
                    options={FAMILY_TYPE_OPTIONS}
                    placeholder={false}
                  />
                </div>

                <Select
                  id="familyValues"
                  name="familyValues"
                  label="Family Values"
                  labelStyle="wizard"
                  fieldSize="compact"
                  value={formData.familyValues || "Traditional"}
                  onChange={handleChange}
                  options={FAMILY_VALUES_OPTIONS}
                  placeholder={false}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Father's Occupation
                    </label>
                    <input
                      type="text"
                      name="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Business Executive, Government Officer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Mother's Occupation
                    </label>
                    <input
                      type="text"
                      name="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                      placeholder="e.g. Homemaker, Teacher"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Sibling Count (Brother / Sister)
                  </label>
                  <input
                    type="number"
                    name="siblingCount"
                    min={0}
                    value={formData.siblingCount}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                    placeholder="e.g. 1"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Partner Preferences
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Preferred Age Range
                      </label>
                      <input
                        type="text"
                        name="partnerAgeRange"
                        value={formData.partnerAgeRange || ""}
                        onChange={handleChange}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                        placeholder="e.g. 23 - 28 Yrs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Preferred Caste / Community
                      </label>
                      <input
                        type="text"
                        name="partnerCaste"
                        value={formData.partnerCaste || ""}
                        onChange={handleChange}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                        placeholder="e.g. Open to All"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Preferred Qualifications
                      </label>
                      <input
                        type="text"
                        name="partnerEducation"
                        value={formData.partnerEducation || ""}
                        onChange={handleChange}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                        placeholder="e.g. CA / CS / Post Graduate"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Min Preferred Income
                      </label>
                      <input
                        type="text"
                        name="partnerIncomeMin"
                        value={formData.partnerIncomeMin || ""}
                        onChange={handleChange}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/50"
                        placeholder="e.g. ₹10 LPA+"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: ID PROOFS & PHOTO UPLOADS */}
            {currentStep === 7 && (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Government ID Upload Box */}
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept={UPLOAD_ACCEPT}
                  />
                  {uploadError && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200">
                      {uploadError}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                    Government ID Proof (Aadhaar / Passport) <span className="text-maroon-500">*</span>
                  </span>

                  {formData.govtIdFile ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-2xl flex items-center justify-between border border-emerald-200">
                      <span className="text-xs font-bold truncate max-w-[80%]">
                        ✓ {mediaFileDisplayName(formData.govtIdFile, govtIdFileName, "Government ID")}
                      </span>
                      <button
                        onClick={() => {
                          setFormData(p => ({ ...p, govtIdFile: "" }));
                          setGovtIdFileName("");
                        }}
                        className="text-[10px] font-bold uppercase underline cursor-pointer text-slate-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker("govtIdFile")}
                      disabled={!!pendingUploadField}
                      className="w-full py-6 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {pendingUploadField === "govtIdFile" ? (
                        <span className="text-xs font-semibold animate-pulse">Uploading…</span>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-xs font-semibold">Click to upload Government ID</span>
                          <span className="text-[9px] text-slate-400 font-light">PDF, JPG, JPEG, PNG, WEBP (max 5MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* CA / Qualification Degree Mock Upload Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                    Highest Degree Certificate (e.g. CA Certificate) <span className="text-maroon-500">*</span>
                  </span>
                  
                  {formData.degreeFile ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-2xl flex items-center justify-between border border-emerald-200">
                      <span className="text-xs font-bold truncate max-w-[80%]">
                        ✓ {mediaFileDisplayName(formData.degreeFile, degreeFileName, "Degree certificate")}
                      </span>
                      <button
                        onClick={() => {
                          setFormData(p => ({ ...p, degreeFile: "" }));
                          setDegreeFileName("");
                        }}
                        className="text-[10px] font-bold uppercase underline cursor-pointer text-slate-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker("degreeFile")}
                      disabled={!!pendingUploadField}
                      className="w-full py-6 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {pendingUploadField === "degreeFile" ? (
                        <span className="text-xs font-semibold animate-pulse">Uploading…</span>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-xs font-semibold">Click to upload Degree Proof</span>
                          <span className="text-[9px] text-slate-400 font-light">PDF, JPG, JPEG, PNG, WEBP (max 5MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Media Photos Upload */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                    Upload Profile Photos (Min 2, Max 10)
                  </span>

                  <div className="flex flex-wrap gap-3">
                    
                    {/* Add Photo Button */}
                    {(formData.photos?.length || 0) < 10 && (
                      <button
                        type="button"
                        onClick={() => openFilePicker("photos")}
                        disabled={!!pendingUploadField}
                        className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-maroon-500 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {pendingUploadField === "photos" ? (
                          <span className="text-[8px] font-bold uppercase animate-pulse">…</span>
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            <span className="text-[8px] font-bold uppercase">Add</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Uploaded Photos items list */}
                    {formData.photos?.map((photo, pIdx) => (
                      <div key={pIdx} className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/25 relative group">
                        <img
                          src={absMedia(photo) || photo}
                          alt={`Uploaded profile photo ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remove photo ${pIdx + 1}`}
                          onClick={() => {
                            const remainingPhotos = formData.photos?.filter((_, i) => i !== pIdx) || [];
                            setFormData(prev => ({ ...prev, photos: remainingPhotos }));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold cursor-pointer border border-white z-10"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                  </div>
                </div>

                {/* Bottom preview strip — all uploads in one place */}
                {(formData.govtIdFile ||
                  formData.degreeFile ||
                  (formData.photos?.length || 0) > 0 ||
                  pendingUploadField) && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Upload preview
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {(formData.photos?.length || 0)}/10 photos
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Government ID */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                        <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                          {pendingUploadField === "govtIdFile" ? (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-[10px] font-semibold">Uploading…</span>
                            </div>
                          ) : formData.govtIdFile ? (
                            isImageMediaUrl(formData.govtIdFile, govtIdFileName) ? (
                              <img
                                src={absMedia(formData.govtIdFile) || formData.govtIdFile}
                                alt="Government ID preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-maroon-500 px-2 text-center">
                                <FileText className="w-8 h-8" />
                                <span className="text-[10px] font-bold uppercase">PDF</span>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium px-2 text-center">
                              No ID uploaded
                            </span>
                          )}
                        </div>
                        <p className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate border-t border-slate-100 dark:border-slate-700">
                          Govt ID
                          {formData.govtIdFile
                            ? ` · ${mediaFileDisplayName(formData.govtIdFile, govtIdFileName, "Document")}`
                            : ""}
                        </p>
                      </div>

                      {/* Degree certificate */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                        <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                          {pendingUploadField === "degreeFile" ? (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-[10px] font-semibold">Uploading…</span>
                            </div>
                          ) : formData.degreeFile ? (
                            isImageMediaUrl(formData.degreeFile, degreeFileName) ? (
                              <img
                                src={absMedia(formData.degreeFile) || formData.degreeFile}
                                alt="Degree certificate preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-maroon-500 px-2 text-center">
                                <FileText className="w-8 h-8" />
                                <span className="text-[10px] font-bold uppercase">PDF</span>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium px-2 text-center">
                              No degree uploaded
                            </span>
                          )}
                        </div>
                        <p className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate border-t border-slate-100 dark:border-slate-700">
                          Degree
                          {formData.degreeFile
                            ? ` · ${mediaFileDisplayName(formData.degreeFile, degreeFileName, "Document")}`
                            : ""}
                        </p>
                      </div>

                      {/* Profile photos — span remaining columns on small screens */}
                      <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                        <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900 p-2 flex flex-wrap gap-1.5 content-start overflow-y-auto">
                          {pendingUploadField === "photos" && (
                            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          )}
                          {formData.photos?.map((photo, pIdx) => (
                            <img
                              key={`preview-photo-${pIdx}`}
                              src={absMedia(photo) || photo}
                              alt={`Profile photo ${pIdx + 1}`}
                              className="w-14 h-14 rounded-lg object-cover border border-emerald-500/30"
                            />
                          ))}
                          {!pendingUploadField &&
                            (formData.photos?.length || 0) === 0 && (
                              <span className="text-[10px] text-slate-400 font-medium m-auto text-center px-2">
                                No photos yet (min 2)
                              </span>
                            )}
                        </div>
                        <p className="px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">
                          Profile photos ({formData.photos?.length || 0})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 p-4 bg-maroon-50 text-maroon-600 dark:bg-maroon-950/30 dark:text-maroon-400 rounded-2xl border border-maroon-100 dark:border-maroon-900/50 text-xs font-semibold">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Your uploaded files and photos are fully protected. ID documents are visible only to internal auditors. Photos abide by your chosen visibility levels.</span>
                </div>

              </div>
            )}

          </div>

          {/* Stepper Footer Controls */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-3">
            {stepError && (
              <div role="alert" className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-100 dark:border-red-900">
                {stepError}
              </div>
            )}
            <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              size="md"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={submitting || !!pendingUploadField}
              loading={submitting || !!pendingUploadField}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              {currentStep === TOTAL_STEPS
                ? submitting
                  ? "Saving…"
                  : pendingUploadField
                    ? "Uploading…"
                    : "Finish Profile"
                : "Continue"}{" "}
              <ArrowRight className="w-4 h-4" />
            </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
