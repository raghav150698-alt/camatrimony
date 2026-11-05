"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Briefcase, 
  MapPin, 
  FileText, 
  Users, 
  Sparkles, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Lock,
  Plus,
  Trash2,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PageHeader from "@/components/layout/PageHeader";
import ProfileMediaEditor from "@/components/registration/ProfileMediaEditor";
import { validateUploadFile, parseAgeRange, incomeInLakhs } from "@camatrimony/shared";
import { Button, Select } from "@camatrimony/ui";
import { Badge } from "@camatrimony/ui";
import { Input } from "@camatrimony/ui";
import { Textarea } from "@camatrimony/ui";
import { Toast,  ToastMessage  } from "@camatrimony/ui";
import { Card, CardHeader, CardBody } from "@camatrimony/ui";
import {
  PROFILE_CREATED_BY_OPTIONS,
  DIET_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  EMPLOYED_IN_OPTIONS,
  ANNUAL_INCOME_OPTIONS,
  FAMILY_STATUS_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  KUJA_DOSHAM_OPTIONS,
  RASI_OPTIONS,
  NAKSHATRA_OPTIONS,
  toSelectOptions,
} from "@camatrimony/shared";
import { useAuth, DBUserProfile } from "@/context/AuthContext";
import { uploadFile } from "@camatrimony/api-client";
import DegreeField from "@/components/registration/DegreeField";
import { minimumProfileAge, validateProfileAge, validateProfileDegree } from "@camatrimony/shared";

export default function EditProfilePage() {
  const { user, dbUser, loading: authLoading, updateProfileData } = useAuth();
  const router = useRouter();

  // Active form section accordion state
  const [activeSection, setActiveSection] = useState<string>("basic");

  // Local Form state
  const [formData, setFormData] = useState<Partial<DBUserProfile>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingUploadField, setPendingUploadField] = useState<"govtIdFile" | "degreeFile" | "photos" | null>(null);
  const [uploadingField, setUploadingField] = useState<"govtIdFile" | "degreeFile" | "photos" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Pre-populate fields on mount/sync
  useEffect(() => {
    if (dbUser) {
      const defaults = {
        profileCreatedBy: "Self",
        gender: "Male",
        diet: "Vegetarian",
        age: 26,
        height: "5'8\"",
        weight: 70,
        maritalStatus: "Never Married",
        religion: "Hindu",
        caste: "Brahmin",
        subcaste: "",
        gothram: "",
        birthDate: "",
        birthTime: "",
        birthPlace: "",
        rasi: "Aries (Mesha)",
        nakshatram: "Aswini",
        kujaDosham: "No",
        highestDegree: "Chartered Accountant (CA)",
        employedIn: "Private Sector",
        occupation: "Senior Consultant",
        annualIncome: "₹15 - ₹20 LPA",
        workLocation: "Hyderabad, Telangana",
        isNri: false,
        familyStatus: "Upper-Middle Class",
        familyType: "Nuclear",
        fatherOccupation: "Retired Officer",
        motherOccupation: "Homemaker",
        siblingCount: 1,
        partnerAgeRange: "22 - 27 Yrs",
        partnerCaste: "Open to All",
        partnerEducation: "Chartered Accountant / CS / MBA",
        partnerIncomeMin: "₹10 LPA+",
        govtIdFile: "",
        degreeFile: "",
        photos: [],
        aboutMe: "",
      };
      setFormData(Object.assign({}, defaults, dbUser));
    }
  }, [dbUser]);

  const addToast = (type: "success" | "error" | "warning" | "info", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Section Validation rules
  const validateSection = (section: string): boolean => {
    const ageError = validateProfileAge(formData.age, formData.gender);
    if (ageError) { addToast("error", "Check age", ageError); return false; }
    if (section === "career") {
      const degreeError = validateProfileDegree(formData.highestDegree);
      if (degreeError) { addToast("error", "Check qualification", degreeError); return false; }
    }
    if (section === "basic") {
      if (!formData.profileCreatedBy || !formData.gender || !formData.diet) {
        addToast("error", "Validation Failed", "Managed by, Gender, and Diet are required.");
        return false;
      }
    }
    if (section === "bio") {
      if (!formData.age || !formData.height || !formData.maritalStatus) {
        addToast("error", "Validation Failed", "Age, Height, and Marital status are required.");
        return false;
      }
    }
    if (section === "cultural") {
      if (!formData.religion || !formData.caste) {
        addToast("error", "Validation Failed", "Religion and Caste are required.");
        return false;
      }
    }
    if (section === "career") {
      if (!formData.highestDegree || !formData.annualIncome || !formData.occupation || !formData.workLocation) {
        addToast("error", "Validation Failed", "Degree, Occupation, Income, and Location are required.");
        return false;
      }
    }
    if (section === "partner") {
      if (formData.partnerAgeRange && !parseAgeRange(formData.partnerAgeRange)) { addToast("error", "Check age range", "Use a range such as 25 - 30 years."); return false; }
      if (formData.partnerIncomeMin && incomeInLakhs(formData.partnerIncomeMin) === null) { addToast("error", "Check income", "Use annual INR income, such as ₹15 LPA."); return false; }
    }
    if (section === "documents") {
      if (!formData.govtIdFile || !formData.degreeFile || (formData.photos?.length || 0) < 2) {
        addToast("error", "Complete your media", "Add both documents and at least two photos before saving.");
        return false;
      }
    }
    return true;
  };

  // Calculate completion percentage
  const percent = useMemo(() => {
    const importantFields: (keyof DBUserProfile)[] = [
      "profileCreatedBy", "gender", "diet", "age", "height", "maritalStatus",
      "religion", "caste", "birthDate", "birthPlace", "highestDegree",
      "employedIn", "occupation", "annualIncome", "workLocation",
      "familyStatus", "familyType", "partnerAgeRange", "partnerEducation"
    ];
    
    let filledCount = 0;
    importantFields.forEach(field => {
      if (formData[field] !== undefined && formData[field] !== "") {
        filledCount++;
      }
    });

    if (formData.govtIdFile) filledCount += 1.5;
    if (formData.degreeFile) filledCount += 1.5;
    if (formData.photos && formData.photos.length >= 2) filledCount += 2;

    return Math.min(100, Math.round((filledCount / (importantFields.length + 5)) * 100));
  }, [formData]);

  // Save specific section
  const handleSaveSection = async (section: string) => {
    if (!user) return;
    if (!validateSection(section)) return;

    setSavingSection(section);
    try {
      await updateProfileData({
        ...formData,
        completionPercentage: percent
      });
      addToast("success", "Changes saved", "Your profile is up to date.");
    } catch (err) {
      addToast("error", "Save Failed", "Could not save your changes. Please try again.");
    } finally {
      setSavingSection(null);
    }
  };

  // Real R2 upload via API
  const openFilePicker = (field: "govtIdFile" | "degreeFile" | "photos") => {
    setPendingUploadField(field);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = pendingUploadField;
    if (!file || !field || uploadingField) return;
    const category = field === "photos" ? "photos" : field === "govtIdFile" ? "govt_id" : "degree";
    const invalid = validateUploadFile(file, category);
    if (invalid) { addToast("error", "Check this file", invalid); e.target.value = ""; return; }
    setUploadingField(field);
    try {
      const category = field === "photos" ? "photos" : field === "govtIdFile" ? "govt_id" : "degree";
      const res = await uploadFile(file, category);
      if (res.success && res.data) {
        const { url } = res.data;
        if (!url) throw new Error("Upload did not return a file URL.");
        if (field === "photos") {
          const current = formData.photos || [];
          if (current.length >= 10) return;
          setFormData(prev => ({
            ...prev,
            photos: [...current, url]
          }));
        } else {
          setFormData(prev => ({ ...prev, [field]: url }));
        }
        addToast("success", "File Uploaded", `${file.name} has been uploaded successfully.`);
      } else {
        addToast("error", "Upload Failed", res.error || "Could not upload file.");
      }
    } catch (err) {
      addToast("error", "Upload Error", "Failed to connect to upload service.");
    } finally {
      setUploadingField(null);
      setPendingUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Protect client route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent("/profile/edit")}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !formData.gender) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-10 w-10 text-maroon-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-semibold text-slate-400">Opening profile editor...</span>
        </div>
      </Layout>
    );
  }

  const sections = [
    { id: "basic", title: "Basic Account Setup", icon: <User className="w-4 h-4 text-maroon-500" /> },
    { id: "bio", title: "Physical & Marital Bio", icon: <FileText className="w-4 h-4 text-maroon-500" /> },
    { id: "cultural", title: "Cultural & Community", icon: <CompassIcon className="w-4 h-4 text-maroon-500" /> },
    { id: "astro", title: "Astrology", icon: <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> },
    { id: "career", title: "Career & Finances", icon: <Briefcase className="w-4 h-4 text-maroon-500" /> },
    { id: "family", title: "Family Details", icon: <Users className="w-4 h-4 text-maroon-500" /> },
    { id: "partner", title: "Partner Preferences", icon: <AwardIcon className="w-4 h-4 text-maroon-500" /> },
    { id: "documents", title: "Identity & photos", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> },
  ];

  return (
    <Layout>
      <div className="site-container space-y-7">
        
        {/* Toast Container */}
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-[calc(100vw-2.5rem)] sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>

        {/* Back Link */}
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-maroon-500 text-sm font-semibold transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to matches
        </button>

        <PageHeader eyebrow="YOUR PROFILE" title="Make it yours." description="A little about you. A clearer picture for your matches.">
          <div className="completion-summary"><strong>{percent}%</strong><span>profile complete</span><progress value={percent} max={100} aria-label="Profile completion" /></div>
        </PageHeader>

        <div className="profile-edit-layout">
          
          {/* LEFT SIDEBAR NAVIGATION DECK */}
          <label className="profile-section-picker">Editing section<select value={activeSection} onChange={event => setActiveSection(event.target.value)}>{sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
          <aside className="profile-section-nav" aria-label="Profile sections">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 pb-2">Profile sections</span>
            
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                aria-pressed={activeSection === sec.id}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeSection === sec.id
                    ? "bg-maroon-500 text-white shadow-md shadow-maroon-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${activeSection === sec.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {sec.icon}
                  </div>
                  <span>{sec.title}</span>
                </div>

              </button>
            ))}
          </aside>

          {/* RIGHT DETAILED EDITOR PANEL */}
          <section className="min-w-0">
            
            {/* 1. BASIC ACCOUNT SETUP */}
            {activeSection === "basic" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-maroon-500" /> Basic Account Setup
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <Input name="fullName" label="Full name" value={formData.fullName || ""} onChange={handleChange} autoComplete="name" required />
                  <Select
                    name="profileCreatedBy"
                    label="Profile Managed By"
                    labelStyle="wizard"
                    fieldSize="compact"
                    value={formData.profileCreatedBy}
                    onChange={handleChange}
                    options={PROFILE_CREATED_BY_OPTIONS}
                    placeholder={false}
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Candidate Gender</label>
                    <div className="grid grid-cols-2 gap-4">
                      {["Male", "Female"].map(gen => (
                        <button
                          key={gen}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, gender: gen }))}
                          className={`py-3 rounded-2xl font-bold text-sm border transition-all cursor-pointer ${
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
                    name="diet"
                    label="Dietary Preference"
                    labelStyle="wizard"
                    fieldSize="compact"
                    value={formData.diet}
                    onChange={handleChange}
                    options={DIET_OPTIONS}
                    placeholder={false}
                  />

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("basic")}
                      loading={savingSection === "basic"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 2. PHYSICAL & MARITAL BIO */}
            {activeSection === "bio" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-maroon-500" /> Physical & Marital Bio
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Candidate Age (Yrs)"
                      min={minimumProfileAge(formData.gender)} max={70} step={1}
                      helperText={`Minimum age: ${minimumProfileAge(formData.gender)} years.`}
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      type="text"
                      label="Height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      required
                      placeholder="e.g. 5ft 8in"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      label="Weight (Kg)"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                    />
                    <Select
                      name="maritalStatus"
                      label="Marital Status"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.maritalStatus}
                      onChange={handleChange}
                      options={MARITAL_STATUS_OPTIONS}
                      placeholder={false}
                    />
                  </div>

                  <Textarea
                    label="About Me / Candidate Bio Summary"
                    name="aboutMe"
                    value={formData.aboutMe || ""}
                    onChange={handleChange}
                    placeholder="Describe your candidate's personality, goals, family upbringing, and partner expectations..."
                    className="text-xs"
                  />

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("bio")}
                      loading={savingSection === "bio"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 3. CULTURAL DETAILS */}
            {activeSection === "cultural" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <CompassIcon className="w-5 h-5 text-maroon-500" /> Cultural & Community
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      name="religion"
                      label="Religion"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.religion}
                      onChange={handleChange}
                      options={RELIGION_OPTIONS}
                      placeholder={false}
                    />
                    <Input
                      type="text"
                      label="Caste"
                      name="caste"
                      value={formData.caste}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Subcaste (Optional)"
                      name="subcaste"
                      value={formData.subcaste}
                      onChange={handleChange}
                    />
                    <Input
                      type="text"
                      label="Gothram"
                      name="gothram"
                      value={formData.gothram}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("cultural")}
                      loading={savingSection === "cultural"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 4. ASTROLOGY DETAILS */}
            {activeSection === "astro" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" /> Astrology
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Birth Date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                    />
                    <Input
                      type="time"
                      label="Birth Time"
                      name="birthTime"
                      value={formData.birthTime}
                      onChange={handleChange}
                    />
                  </div>

                  <Input
                    type="text"
                    label="Birth Place"
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleChange}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <Select
                      name="rasi"
                      label="Rasi (Moon Sign)"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.rasi}
                      onChange={handleChange}
                      options={toSelectOptions(RASI_OPTIONS)}
                      placeholder="Select Rasi"
                    />
                    <Select
                      name="nakshatram"
                      label="Star (Nakshatram)"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.nakshatram}
                      onChange={handleChange}
                      options={toSelectOptions(NAKSHATRA_OPTIONS)}
                      placeholder="Select Nakshatra"
                    />
                    <Select
                      name="kujaDosham"
                      label="Kuja Dosham?"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.kujaDosham}
                      onChange={handleChange}
                      options={toSelectOptions(KUJA_DOSHAM_OPTIONS)}
                      placeholder={false}
                    />
                  </div>

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("astro")}
                      loading={savingSection === "astro"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 5. CAREER & INCOME */}
            {activeSection === "career" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-maroon-500" /> Career & Income
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <DegreeField value={formData.highestDegree || ""} onChange={value => setFormData(prev => ({ ...prev, highestDegree: value }))} />

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      name="employedIn"
                      label="Employed In"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.employedIn}
                      onChange={handleChange}
                      options={EMPLOYED_IN_OPTIONS}
                      placeholder={false}
                    />
                    <Input
                      type="text"
                      label="Occupation / Designation"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      name="annualIncome"
                      label="Annual Income"
                      labelStyle="wizard"
                      fieldSize="compact"
                      value={formData.annualIncome}
                      onChange={handleChange}
                      options={ANNUAL_INCOME_OPTIONS}
                      placeholder={false}
                    />
                    <Input
                      type="text"
                      label="Current Work City"
                      name="workLocation"
                      value={formData.workLocation}
                      onChange={handleChange}
                      required
                    />
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
                    <label htmlFor="isNri" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase cursor-pointer tracking-wider">
                      Candidate holds Non-Resident Indian (NRI) status
                    </label>
                  </div>

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("career")}
                      loading={savingSection === "career"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 6. FAMILY PROFILE */}
            {activeSection === "family" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-maroon-500" /> Family Profile
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Select
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Father's Occupation"
                      name="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={handleChange}
                    />
                    <Input
                      type="text"
                      label="Mother's Occupation"
                      name="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={handleChange}
                    />
                  </div>

                  <Input
                    type="number"
                    label="Siblings Count"
                    name="siblingCount"
                    value={formData.siblingCount}
                    onChange={handleChange}
                  />

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("family")}
                      loading={savingSection === "family"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 7. PARTNER PREFERENCES */}
            {activeSection === "partner" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <AwardIcon className="w-5 h-5 text-maroon-500" /> Partner Preferences
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Preferred Age Range"
                      name="partnerAgeRange"
                      value={formData.partnerAgeRange}
                      onChange={handleChange}
                      placeholder="e.g. 23 - 28 Yrs"
                    />
                    <Input
                      type="text"
                      label="Preferred Caste / Community"
                      name="partnerCaste"
                      value={formData.partnerCaste}
                      onChange={handleChange}
                      placeholder="e.g. Brahmin, Open to All"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="text"
                      label="Min Preferred Income"
                      name="partnerIncomeMin"
                      value={formData.partnerIncomeMin}
                      onChange={handleChange}
                      placeholder="e.g. ₹10 LPA+"
                    />
                    <Input
                      type="text"
                      label="Preferred Qualifications"
                      name="partnerEducation"
                      value={formData.partnerEducation}
                      onChange={handleChange}
                      placeholder="e.g. CA / CS / Post Graduate"
                    />
                  </div>

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("partner")}
                      loading={savingSection === "partner"}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

            {/* 8. DOCS & MEDIA */}
            {activeSection === "documents" && (
              <Card className="rounded-[28px] border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn">
                <CardHeader>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> Identity & photos
                  </h3>
                </CardHeader>
                <CardBody className="space-y-6">
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" />
                  <ProfileMediaEditor value={formData} onChange={patch => setFormData(previous => ({ ...previous, ...patch }))} onUpload={openFilePicker} uploading={uploadingField} />

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveSection("documents")}
                      loading={savingSection === "documents"}
                      disabled={!!uploadingField}
                      className="flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save changes
                    </Button>
                  </div>

                </CardBody>
              </Card>
            )}

          </section>

        </div>

      </div>
    </Layout>
  );
}

// Simple Helper Components for Layout
function CompassIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 2 12 22Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16.2426 7.75736L14.1213 14.1213L7.75736 16.2426L9.87868 9.87868L16.2426 7.75736Z" />
    </svg>
  );
}

function AwardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" />
    </svg>
  );
}
