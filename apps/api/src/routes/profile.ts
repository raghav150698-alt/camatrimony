import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import {
  parsePhotos,
  parsePhotosAbsolute,
  getPublicApiBase,
  absolutizeMediaUrl,
  ensureUserRecord,
} from "../lib";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_API_BASE_URL, validateProfileAge, validateProfileDegree } from "@camatrimony/shared";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

function filledStr(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : !!value;
}

function hasCoreFields(row: any): boolean {
  return (
    filledStr(row.full_name ?? row.fullName) &&
    filledStr(row.gender) &&
    !!row.age &&
    Number(row.age) > 0 &&
    filledStr(row.highest_degree ?? row.highestDegree) &&
    filledStr(row.occupation) &&
    filledStr(row.work_location ?? row.workLocation) &&
    filledStr(row.caste)
  );
}

function hasDocsAndPhotos(row: any): boolean {
  const photos = parsePhotos(row.photos);
  return (
    filledStr(row.govt_id_file ?? row.govtIdFile) &&
    filledStr(row.degree_file ?? row.degreeFile) &&
    photos.length >= 2
  );
}

/**
 * Onboarding is complete when the flag is set, OR (legacy) when docs + photos + core fields
 * are all present. Never mark complete from completion_percentage alone.
 */
export function resolveOnboardingCompleted(row: any): boolean {
  if (row.is_onboarding_completed === 1 || row.isOnboardingCompleted === true) {
    return true;
  }
  return hasCoreFields(row) && hasDocsAndPhotos(row);
}

export function mapProfile(row: any, apiBase: string = DEFAULT_API_BASE_URL) {
  return {
    userId: row.user_id,
    fullName: row.full_name ?? row.fullName ?? "",
    profileCreatedBy: row.profile_created_by ?? row.profileCreatedBy ?? "Self",
    gender: row.gender,
    diet: row.diet,
    age: row.age,
    height: row.height,
    weight: row.weight,
    maritalStatus: row.marital_status ?? row.maritalStatus,
    motherTongue: row.mother_tongue ?? row.motherTongue ?? "",
    religion: row.religion,
    caste: row.caste,
    subcaste: row.subcaste,
    gothram: row.gothram,
    birthDate: row.birth_date ?? row.birthDate,
    birthTime: row.birth_time ?? row.birthTime,
    birthPlace: row.birth_place ?? row.birthPlace,
    rasi: row.rasi,
    nakshatram: row.nakshatram,
    kujaDosham: row.kuja_dosham ?? row.kujaDosham,
    physicalStatus: row.physical_status ?? row.physicalStatus ?? "Normal",
    highestDegree: row.highest_degree ?? row.highestDegree,
    employedIn: row.employed_in ?? row.employedIn,
    occupation: row.occupation,
    annualIncome: row.annual_income ?? row.annualIncome,
    workLocation: row.work_location ?? row.workLocation,
    address: row.address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    country: row.country ?? "India",
    isNri: row.is_nri === 1 || row.isNri === true,
    familyStatus: row.family_status ?? row.familyStatus,
    familyType: row.family_type ?? row.familyType,
    familyValues: row.family_values ?? row.familyValues ?? "",
    fatherOccupation: row.father_occupation ?? row.fatherOccupation,
    motherOccupation: row.mother_occupation ?? row.motherOccupation,
    siblingCount: row.sibling_count ?? row.siblingCount ?? 0,
    partnerAgeRange: row.partner_age_range ?? row.partnerAgeRange ?? "",
    partnerCaste: row.partner_caste ?? row.partnerCaste ?? "",
    partnerEducation: row.partner_education ?? row.partnerEducation ?? "",
    partnerIncomeMin: row.partner_income_min ?? row.partnerIncomeMin ?? "",
    completionPercentage: row.completion_percentage ?? row.completionPercentage ?? 0,
    isOnboardingCompleted: resolveOnboardingCompleted(row),
    govtIdFile: absolutizeMediaUrl(row.govt_id_file ?? row.govtIdFile, apiBase) || undefined,
    degreeFile: absolutizeMediaUrl(row.degree_file ?? row.degreeFile, apiBase) || undefined,
    photos: parsePhotosAbsolute(row.photos, apiBase),
    paymentProofUrl:
      absolutizeMediaUrl(row.payment_proof_url ?? row.paymentProofUrl, apiBase) || undefined,
    isVerified: row.is_verified === 1 || row.isVerified === true,
    isFeatured: row.is_featured === 1 || row.isFeatured === true,
    aboutMe: row.about_me ?? row.aboutMe,
    lastActiveAt: row.last_active_at ?? row.lastActiveAt,
    role: row.role,
    userStatus: row.user_status ?? row.userStatus,
    email: row.user_email ?? row.email,
  };
}

/** Signed-in biodata, independent of contact unlocks. Never returns contact or KYC. */
export function mapMemberProfile(row: any, apiBase: string = DEFAULT_API_BASE_URL, canSeePhotos = false) {
  const mapped = mapProfile(row, apiBase);
  const { address, email, govtIdFile, degreeFile, paymentProofUrl, role, userStatus,
    completionPercentage, isOnboardingCompleted, ...biodata } = mapped;
  return {
    ...Object.fromEntries(Object.entries(biodata).map(([key, value]) => [key, value ?? null])),
    annualIncome: row.hide_income === 1 ? "" : mapped.annualIncome,
    photos: canSeePhotos ? mapped.photos : [],
    canViewPhotos: canSeePhotos,
  };
}

/** Public/catalog-safe projection — no email, phone, address, docs, or proof. */
export function mapPublicProfile(row: any, apiBase: string = DEFAULT_API_BASE_URL) {
  return {
    userId: row.user_id,
    fullName: row.full_name ?? row.fullName ?? "",
    profileCreatedBy: row.profile_created_by ?? row.profileCreatedBy ?? "Self",
    gender: row.gender,
    diet: row.diet,
    age: row.age,
    height: row.height,
    weight: row.weight,
    maritalStatus: row.marital_status ?? row.maritalStatus,
    motherTongue: row.mother_tongue ?? row.motherTongue ?? "",
    religion: row.religion,
    caste: row.caste,
    subcaste: row.subcaste,
    gothram: row.gothram,
    birthPlace: row.birth_place ?? row.birthPlace,
    rasi: row.rasi,
    nakshatram: row.nakshatram,
    kujaDosham: row.kuja_dosham ?? row.kujaDosham,
    physicalStatus: row.physical_status ?? row.physicalStatus ?? "Normal",
    highestDegree: row.highest_degree ?? row.highestDegree,
    employedIn: row.employed_in ?? row.employedIn,
    occupation: row.occupation,
    annualIncome: row.hide_income === 1 ? "" : row.annual_income ?? row.annualIncome,
    workLocation: row.work_location ?? row.workLocation,
    city: row.city ?? "",
    state: row.state ?? "",
    country: row.country ?? "India",
    isNri: row.is_nri === 1 || row.isNri === true,
    familyStatus: row.family_status ?? row.familyStatus,
    familyType: row.family_type ?? row.familyType,
    familyValues: row.family_values ?? row.familyValues ?? "",
    photos: row.photo_visibility === "private" ? [] : parsePhotosAbsolute(row.photos, apiBase),
    isVerified: row.is_verified === 1 || row.isVerified === true,
    isFeatured: row.is_featured === 1 || row.isFeatured === true,
    aboutMe: row.about_me ?? row.aboutMe,
    lastActiveAt: row.last_active_at ?? row.lastActiveAt,
  };
}

// GET /v1/profile - Fetch verified profile details
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const userId = user.id;
  const apiBase = getPublicApiBase(c.env, c.req.url);

  try {
    const db = c.env.DB;

    const now = new Date().toISOString();
    await db.prepare("UPDATE profiles SET last_active_at = ? WHERE user_id = ?").bind(now, userId).run();

    await db
      .prepare("UPDATE users SET last_login_at = ?, login_count = login_count + 1 WHERE id = ?")
      .bind(now, userId)
      .run();

    const row = await db
      .prepare(
        `SELECT p.*, u.role, u.status AS user_status, u.email AS user_email
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ?`
      )
      .bind(userId)
      .first<any>();

    if (!row) {
      const userRow = await db
        .prepare("SELECT * FROM users WHERE id = ?")
        .bind(userId)
        .first<{ role: string; status: string }>();

      if (userRow) {
        return c.json({
          success: true,
          profile: {
            userId,
            role: userRow.role,
            userStatus: userRow.status,
            isOnboardingCompleted: false,
            completionPercentage: 0,
          },
        });
      }
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({
      success: true,
      profile: mapProfile(row, apiBase),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/profile - Update or create profile
app.post("/", requireAuth, async (c) => {
  try {
    const user = c.get("user")!;
    const body = await c.req.json();
    const { userId: _unused, ...profileData } = body;
    const userId = user.id;
    const apiBase = getPublicApiBase(c.env, c.req.url);

    const db = c.env.DB;

    // CRITICAL FIX: Do NOT accept is_verified or is_featured from client.
    const existing = await db
      .prepare("SELECT * FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<any>();

    const isVerified = existing ? existing.is_verified : 0;
    const isFeatured = existing ? existing.is_featured : 0;

    const photosFromClient = Array.isArray(profileData.photos) ? profileData.photos : null;
    const photosJSON = JSON.stringify(
      photosFromClient !== null
        ? photosFromClient
        : existing?.photos
          ? typeof existing.photos === "string"
            ? JSON.parse(existing.photos || "[]")
            : existing.photos
          : []
    );

    const now = new Date().toISOString();

    const candidateAge = profileData.age ?? existing?.age;
    const candidateGender = profileData.gender ?? existing?.gender;
    if (candidateAge !== undefined && candidateAge !== null) {
      const error = validateProfileAge(candidateAge, candidateGender);
      if (error) return c.json({ success: false, error }, 400);
    }
    const degree = profileData.highestDegree ?? profileData.highest_degree;
    if (degree !== undefined) {
      const error = validateProfileDegree(degree);
      if (error) return c.json({ success: false, error }, 400);
      profileData.highestDegree = degree.trim();
    }
    const age = Number(candidateAge);
    const weight =
      profileData.weight === undefined || profileData.weight === null || profileData.weight === ""
        ? existing?.weight ?? null
        : Number(profileData.weight);
    const siblingCount =
      profileData.siblingCount !== undefined || profileData.sibling_count !== undefined
        ? Number(profileData.siblingCount ?? profileData.sibling_count ?? 0) || 0
        : existing?.sibling_count ?? 0;

    const workLocation =
      profileData.workLocation ||
      [profileData.city, profileData.state, profileData.country].filter(Boolean).join(", ") ||
      existing?.work_location ||
      null;

    const govtIdFile =
      profileData.govtIdFile ?? profileData.govt_id_file ?? existing?.govt_id_file ?? null;
    const degreeFile =
      profileData.degreeFile ?? profileData.degree_file ?? existing?.degree_file ?? null;
    const paymentProofUrl =
      profileData.paymentProofUrl ??
      profileData.payment_proof_url ??
      existing?.payment_proof_url ??
      null;

    const mergedRow = {
      ...(existing || {}),
      full_name: profileData.fullName || profileData.full_name || existing?.full_name || null,
      gender: profileData.gender ?? existing?.gender,
      age: Number.isFinite(age) && age > 0 ? age : existing?.age,
      highest_degree: profileData.highestDegree ?? profileData.highest_degree ?? existing?.highest_degree,
      occupation: profileData.occupation ?? existing?.occupation,
      work_location: workLocation,
      caste: profileData.caste ?? existing?.caste,
      govt_id_file: govtIdFile,
      degree_file: degreeFile,
      photos: photosJSON,
    };

    const clientOnboarding =
      profileData.isOnboardingCompleted === true ||
      profileData.is_onboarding_completed === true ||
      profileData.is_onboarding_completed === 1;

    // Never trust client alone: require core fields + docs/photos before marking complete.
    let isOnboardingCompleted = existing?.is_onboarding_completed === 1 ? 1 : 0;
    if (clientOnboarding || isOnboardingCompleted === 1) {
      isOnboardingCompleted =
        hasCoreFields(mergedRow) && hasDocsAndPhotos(mergedRow) ? 1 : isOnboardingCompleted;
      if (clientOnboarding && isOnboardingCompleted !== 1) {
        return c.json(
          {
            error:
              "Onboarding cannot be marked complete until core biodata, government ID, degree certificate, and at least 2 photos are saved.",
          },
          400
        );
      }
    }

    // User row must exist before profiles (FK: profiles.user_id → users.id).
    await ensureUserRecord(db, userId, profileData.email || user.email || null, now);

    // UPSERT — never REPLACE (REPLACE deletes the row and NULLs columns not listed,
    // e.g. is_featured_until / created_at, and previously wiped KYC when omitted).
    await db
      .prepare(
        `INSERT INTO profiles (
          user_id, full_name, profile_created_by, gender, diet, age, height, weight, marital_status,
          mother_tongue, religion, caste, subcaste, gothram, birth_date, birth_time, birth_place,
          rasi, nakshatram, kuja_dosham, physical_status, highest_degree, employed_in, occupation,
          annual_income, work_location, address, city, state, country, is_nri, family_status, family_type,
          family_values, father_occupation, mother_occupation, sibling_count, partner_age_range,
          partner_caste, partner_education, partner_income_min, completion_percentage,
          govt_id_file, degree_file, photos, payment_proof_url, is_verified, is_featured, about_me, last_active_at,
          is_onboarding_completed
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(user_id) DO UPDATE SET
          full_name = excluded.full_name,
          profile_created_by = excluded.profile_created_by,
          gender = excluded.gender,
          diet = excluded.diet,
          age = excluded.age,
          height = excluded.height,
          weight = excluded.weight,
          marital_status = excluded.marital_status,
          mother_tongue = excluded.mother_tongue,
          religion = excluded.religion,
          caste = excluded.caste,
          subcaste = excluded.subcaste,
          gothram = excluded.gothram,
          birth_date = excluded.birth_date,
          birth_time = excluded.birth_time,
          birth_place = excluded.birth_place,
          rasi = excluded.rasi,
          nakshatram = excluded.nakshatram,
          kuja_dosham = excluded.kuja_dosham,
          physical_status = excluded.physical_status,
          highest_degree = excluded.highest_degree,
          employed_in = excluded.employed_in,
          occupation = excluded.occupation,
          annual_income = excluded.annual_income,
          work_location = excluded.work_location,
          address = excluded.address,
          city = excluded.city,
          state = excluded.state,
          country = excluded.country,
          is_nri = excluded.is_nri,
          family_status = excluded.family_status,
          family_type = excluded.family_type,
          family_values = excluded.family_values,
          father_occupation = excluded.father_occupation,
          mother_occupation = excluded.mother_occupation,
          sibling_count = excluded.sibling_count,
          partner_age_range = excluded.partner_age_range,
          partner_caste = excluded.partner_caste,
          partner_education = excluded.partner_education,
          partner_income_min = excluded.partner_income_min,
          completion_percentage = excluded.completion_percentage,
          govt_id_file = excluded.govt_id_file,
          degree_file = excluded.degree_file,
          photos = excluded.photos,
          payment_proof_url = excluded.payment_proof_url,
          is_verified = excluded.is_verified,
          is_featured = excluded.is_featured,
          about_me = excluded.about_me,
          last_active_at = excluded.last_active_at,
          is_onboarding_completed = excluded.is_onboarding_completed`
      )
      .bind(
        userId,
        profileData.fullName || profileData.full_name || existing?.full_name || null,
        profileData.profileCreatedBy || existing?.profile_created_by || "Self",
        profileData.gender ?? existing?.gender,
        profileData.diet || existing?.diet || "Vegetarian",
        Number.isFinite(age) && age > 0 ? age : existing?.age ?? profileData.age,
        profileData.height ?? existing?.height,
        weight !== null && Number.isFinite(Number(weight)) ? Number(weight) : null,
        profileData.maritalStatus || existing?.marital_status || "Never Married",
        profileData.motherTongue || profileData.mother_tongue || existing?.mother_tongue || null,
        profileData.religion || existing?.religion || "Hindu",
        profileData.caste ?? existing?.caste,
        profileData.subcaste ?? existing?.subcaste ?? null,
        profileData.gothram ?? existing?.gothram ?? null,
        profileData.birthDate ?? existing?.birth_date ?? null,
        profileData.birthTime ?? existing?.birth_time ?? null,
        profileData.birthPlace ?? existing?.birth_place ?? null,
        profileData.rasi ?? existing?.rasi ?? null,
        profileData.nakshatram ?? existing?.nakshatram ?? null,
        profileData.kujaDosham || existing?.kuja_dosham || "No",
        profileData.physicalStatus || profileData.physical_status || existing?.physical_status || "Normal",
        profileData.highestDegree ?? existing?.highest_degree,
        profileData.employedIn || existing?.employed_in || "Private Sector",
        profileData.occupation ?? existing?.occupation,
        profileData.annualIncome ?? existing?.annual_income,
        workLocation,
        profileData.address ?? existing?.address ?? null,
        profileData.city ?? existing?.city ?? null,
        profileData.state ?? existing?.state ?? null,
        profileData.country || existing?.country || "India",
        profileData.isNri !== undefined
          ? profileData.isNri
            ? 1
            : 0
          : existing?.is_nri ?? 0,
        profileData.familyStatus || existing?.family_status || "Upper-Middle Class",
        profileData.familyType || existing?.family_type || "Nuclear",
        profileData.familyValues || profileData.family_values || existing?.family_values || null,
        profileData.fatherOccupation ?? existing?.father_occupation ?? null,
        profileData.motherOccupation ?? existing?.mother_occupation ?? null,
        siblingCount,
        profileData.partnerAgeRange ?? existing?.partner_age_range ?? null,
        profileData.partnerCaste ?? existing?.partner_caste ?? null,
        profileData.partnerEducation ?? existing?.partner_education ?? null,
        profileData.partnerIncomeMin ?? existing?.partner_income_min ?? null,
        profileData.completionPercentage ?? existing?.completion_percentage ?? 0,
        govtIdFile,
        degreeFile,
        photosJSON,
        paymentProofUrl,
        isVerified,
        isFeatured,
        profileData.aboutMe ?? existing?.about_me ?? null,
        now,
        isOnboardingCompleted
      )
      .run();

    const saved = await db
      .prepare("SELECT * FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<any>();

    return c.json({
      success: true,
      message: "Profile saved successfully into Cloudflare D1 SQL database.",
      profile: saved
        ? mapProfile(saved, apiBase)
        : {
            isOnboardingCompleted: isOnboardingCompleted === 1,
            completionPercentage: profileData.completionPercentage || 0,
          },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
