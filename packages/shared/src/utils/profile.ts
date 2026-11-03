import type { CandidateProfile } from "../types/profile";

const string = (value: unknown): string => typeof value === "string" ? value : "";

/** Normalize older snake_case responses at the boundary, before UI code reads them. */
export function normalizeCandidateProfile(raw: Record<string, unknown>): CandidateProfile {
  let photos: unknown = raw.photos;
  if (typeof photos === "string") {
    try { photos = JSON.parse(photos); } catch { photos = []; }
  }
  const fullName = string(raw.fullName ?? raw.full_name ?? raw.name);
  return {
    ...raw,
    userId: string(raw.userId ?? raw.user_id),
    fullName,
    name: fullName || "Member",
    age: Number(raw.age) || 0,
    height: string(raw.height),
    gender: string(raw.gender),
    religion: string(raw.religion),
    caste: string(raw.caste),
    highestDegree: string(raw.highestDegree ?? raw.highest_degree),
    occupation: string(raw.occupation),
    annualIncome: string(raw.annualIncome ?? raw.annual_income),
    workLocation: string(raw.workLocation ?? raw.work_location),
    aboutMe: string(raw.aboutMe ?? raw.about_me),
    photos: Array.isArray(photos) ? photos.filter((photo): photo is string => typeof photo === "string" && /^(https?:\/\/|\/)/.test(photo)) : [],
    isVerified: raw.isVerified === true || raw.is_verified === 1,
    isFeatured: raw.isFeatured === true || raw.is_featured === 1,
    lastActiveAt: string(raw.lastActiveAt ?? raw.last_active_at),
  } as CandidateProfile;
}
