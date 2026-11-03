import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { getAuthenticatedUser } from "../middleware/auth";
import { mapPublicProfile, mapMemberProfile } from "./profile";
import { getPublicApiBase } from "../lib";
import { scorePreferenceMatch, type MatchProfileInput } from "@camatrimony/shared";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/profiles - Retrieve candidates catalog with advanced search filters, sorting, and pagination
app.get("/", async (c) => {
  const requestedGender = c.req.query("gender");
  let gender = requestedGender === "all" ? undefined : requestedGender;
  const caste = c.req.query("caste");
  const religion = c.req.query("religion");
  const degree = c.req.query("degree");
  const isNri = c.req.query("isNri");
  const minAge = Number(c.req.query("minAge") || "18");
  const maxAge = Number(c.req.query("maxAge") || "70");
  const location = c.req.query("location");

  const page = Math.max(1, Math.floor(Number(c.req.query("page")) || 1));
  const limit = Math.min(50, Math.max(1, Math.floor(Number(c.req.query("limit")) || 20)));
  const offset = (page - 1) * limit;

  const sortBy = c.req.query("sortBy") || "verified_first";
  const SORT_MAP: Record<string, string> = {
    verified_first: "p.is_verified DESC, p.is_featured DESC",
    newest: "p.created_at DESC",
    last_active: "p.last_active_at DESC",
  };
  const orderBy = SORT_MAP[sortBy] || SORT_MAP.verified_first;

  const currentUser = await getAuthenticatedUser(c);
  if (currentUser?.isBanned) return c.json({ success: false, error: "Account unavailable" }, 403);
  const currentUserId = currentUser?.id || "";

  try {
    const db = c.env.DB;
    const viewer = currentUserId
      ? await db.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(currentUserId).first<MatchProfileInput & { gender?: string }>()
      : null;
    if (sortBy === "recommended" && !currentUserId) {
      return c.json({ success: false, error: "Sign in to see your recommendations" }, 401);
    }
    if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || minAge < 18 || maxAge > 100 || minAge > maxAge) {
      return c.json({ success: false, error: "Choose a valid age range" }, 400);
    }
    if (!gender && requestedGender !== "all" && viewer?.gender) {
      gender = viewer.gender === "Male" ? "Female" : viewer.gender === "Female" ? "Male" : undefined;
    }

    let queryBase = "FROM profiles p LEFT JOIN users u ON p.user_id = u.id LEFT JOIN user_settings privacy ON privacy.user_id = p.user_id WHERE u.status = 'active' AND COALESCE(privacy.hide_profile, 0) = 0";
    const bindings: any[] = [];

    if (gender) {
      queryBase += " AND p.gender = ?";
      bindings.push(gender);
    }
    if (caste) {
      queryBase += " AND p.caste LIKE ?";
      bindings.push(`%${caste}%`);
    }
    if (religion) {
      queryBase += " AND p.religion = ?";
      bindings.push(religion);
    }
    if (degree) {
      queryBase += " AND p.highest_degree LIKE ?";
      bindings.push(`%${degree}%`);
    }
    if (isNri === "true") {
      queryBase += " AND p.is_nri = 1";
    }

    queryBase += " AND p.age >= ? AND p.age <= ?";
    bindings.push(minAge, maxAge);

    if (location) {
      queryBase += " AND (p.work_location LIKE ? OR p.city LIKE ? OR p.birth_place LIKE ?)";
      bindings.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    if (currentUserId) {
      queryBase += `
        AND p.user_id NOT IN (
          SELECT blocked_id FROM blocked_users WHERE blocker_id = ?
          UNION
          SELECT blocker_id FROM blocked_users WHERE blocked_id = ?
        )
        AND p.user_id != ?
      `;
      bindings.push(currentUserId, currentUserId, currentUserId);
    }

    const countRow = await db
      .prepare(`SELECT COUNT(*) as count ${queryBase}`)
      .bind(...bindings)
      .first<{ count: number }>();

    const totalItems = countRow?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const personalized = sortBy === "recommended" && !!viewer;
    const selectSql = `
      SELECT p.*, privacy.hide_income, privacy.photo_visibility
      ${queryBase}
      ORDER BY ${orderBy}
      ${personalized ? "" : "LIMIT ? OFFSET ?"}
    `;

    const dataBindings = personalized ? bindings : [...bindings, limit, offset];
    const rows = await db.prepare(selectSql).bind(...dataBindings).all();

    const apiBase = getPublicApiBase(c.env, c.req.url);
    let ranked = (rows.results || []).map((p: any) => ({
      profile: mapPublicProfile(p, apiBase),
      match: viewer ? scorePreferenceMatch(viewer, { ...p, annual_income: p.hide_income === 1 ? undefined : p.annual_income }) : undefined,
    }));
    // Rank the complete filtered pool before slicing, so page one contains the best fits.
    // Stable user-ID tie-break prevents cards moving between pages with equal scores.
    if (personalized) {
      ranked.sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1)
        || Number(b.profile.isVerified) - Number(a.profile.isVerified)
        || Number(b.profile.isFeatured) - Number(a.profile.isFeatured)
        || a.profile.userId.localeCompare(b.profile.userId));
      ranked = ranked.slice(offset, offset + limit);
    }
    const formattedProfiles = ranked.map(({ profile, match }) => ({ ...profile, match }));

    return c.json({
      success: true,
      profiles: formattedProfiles,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

async function hasUnlockedContact(
  db: D1Database,
  viewerId: string | undefined,
  targetUserId: string
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;
  const unlocked = await db
    .prepare(
      `SELECT 1 FROM contact_unlocks
       WHERE user_id = ? AND unlocked_user_id = ?
       LIMIT 1`
    )
    .bind(viewerId, targetUserId)
    .first();
  return !!unlocked;
}

async function canViewSensitiveProfile(
  db: D1Database,
  viewerId: string | undefined,
  targetUserId: string
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;

  if (await hasUnlockedContact(db, viewerId, targetUserId)) return true;

  const mutual = await db
    .prepare(
      `SELECT 1 FROM interest_requests
       WHERE status = 'accepted'
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`
    )
    .bind(viewerId, targetUserId, targetUserId, viewerId)
    .first();
  return !!mutual;
}

async function mayReadProfile(db: D1Database, viewerId: string | undefined, row: any): Promise<boolean> {
  if (viewerId === row.user_id) return true;
  if (row.user_status !== "active" || row.hide_profile === 1) return false;
  if (!viewerId) return true;
  const blocked = await db.prepare(`SELECT 1 FROM blocked_users
    WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`)
    .bind(viewerId, row.user_id, row.user_id, viewerId).first();
  return !blocked;
}

// GET /v1/profiles/search-by-id - Search profile by user ID
app.get("/search-by-id", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "userId query parameter is required" }, 400);
  }

  try {
    const db = c.env.DB;
    const row = await db
      .prepare(
        `SELECT p.*, u.status as user_status, privacy.hide_profile, privacy.hide_contact, privacy.hide_income, privacy.photo_visibility
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN user_settings privacy ON privacy.user_id = p.user_id
         WHERE p.user_id = ?`
      )
      .bind(userId)
      .first<any>();

    if (!row) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const viewer = await getAuthenticatedUser(c);
    if (viewer?.isBanned || !(await mayReadProfile(db, viewer?.id, row))) return c.json({ error: "Profile not found" }, 404);
    const sensitive = await canViewSensitiveProfile(db, viewer?.id, userId);
    const canSeePhotos = viewer?.id === userId || row.photo_visibility === "public" || !row.photo_visibility || (row.photo_visibility === "members" && !!viewer) || (row.photo_visibility === "premium" && sensitive);
    const apiBase = getPublicApiBase(c.env, c.req.url);

    return c.json({
      success: true,
      profile: (() => {
        const mapped = viewer
      ? mapMemberProfile(row, apiBase, canSeePhotos)
      : mapPublicProfile(row, apiBase);
        delete (mapped as any).govtIdFile;
        delete (mapped as any).degreeFile;
        delete (mapped as any).paymentProofUrl;
        delete (mapped as any).email;
        // Street address is contact-adjacent — only after unlock (or self).
        delete (mapped as any).address;
        if (row.hide_income === 1 && viewer?.id !== userId) mapped.annualIncome = "";
        if (row.photo_visibility === "private" && viewer?.id !== userId) mapped.photos = [];
        return mapped;
      })(),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// GET /v1/profiles/:id - Single profile by user ID
app.get("/:id", async (c) => {
  const userId = c.req.param("id");

  try {
    const db = c.env.DB;
    const row = await db
      .prepare(
        `SELECT p.*, u.status as user_status, privacy.hide_profile, privacy.hide_contact, privacy.hide_income, privacy.photo_visibility
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN user_settings privacy ON privacy.user_id = p.user_id
         WHERE p.user_id = ?`
      )
      .bind(userId)
      .first<any>();

    if (!row) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const viewer = await getAuthenticatedUser(c);
    if (viewer?.isBanned || !(await mayReadProfile(db, viewer?.id, row))) return c.json({ error: "Profile not found" }, 404);

    const sensitive = await canViewSensitiveProfile(db, viewer?.id, userId);
    const canSeePhotos = viewer?.id === userId || row.photo_visibility === "public" || !row.photo_visibility || (row.photo_visibility === "members" && !!viewer) || (row.photo_visibility === "premium" && sensitive);
    const apiBase = getPublicApiBase(c.env, c.req.url);
    const mapped = viewer
      ? mapMemberProfile(row, apiBase, canSeePhotos)
      : mapPublicProfile(row, apiBase);

    // Never leak KYC docs / payment proof on public profile endpoints
    delete (mapped as any).govtIdFile;
    delete (mapped as any).degreeFile;
    delete (mapped as any).paymentProofUrl;
    delete (mapped as any).email;
    delete (mapped as any).address;
        if (row.hide_income === 1 && viewer?.id !== userId) mapped.annualIncome = "";
        if (row.photo_visibility === "private" && viewer?.id !== userId) mapped.photos = [];

    return c.json({
      success: true,
      profile: mapped,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
