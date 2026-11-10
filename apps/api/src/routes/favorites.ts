import {signProfilePhotos} from "../services/media-access";
import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import { parsePhotos } from "../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/favorites - List user's shortlisted profiles
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const rows = await db
      .prepare(
        `SELECT f.created_at as favorited_at, p.user_id, p.gender, p.age, p.height, p.marital_status,
                p.full_name, p.religion, p.caste, p.highest_degree, p.occupation, CASE WHEN privacy.hide_income = 1 THEN NULL ELSE p.annual_income END AS annual_income, p.work_location,
                p.city, p.state, p.country, CASE WHEN privacy.photo_visibility IN ('private','premium') THEN '[]' ELSE p.photos END AS photos, p.is_verified, p.is_featured, p.about_me, p.last_active_at
         FROM favorites f
         LEFT JOIN profiles p ON f.favorited_user_id = p.user_id
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_settings privacy ON privacy.user_id = p.user_id
         WHERE f.user_id = ? AND u.status = 'active' AND COALESCE(privacy.hide_profile,0) = 0
           AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
             (b.blocker_id=f.user_id AND b.blocked_id=p.user_id) OR (b.blocked_id=f.user_id AND b.blocker_id=p.user_id))
         ORDER BY f.created_at DESC`
      )
      .bind(user.id)
      .all();

    const results = await Promise.all((rows.results || []).map((row: any) => signProfilePhotos({...row,photos:parsePhotos(row.photos)},user.id,c.env,c.req.url)));

    return c.json({ success: true, favorites: results });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/favorites - Shortlist/Bookmark a candidate profile
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { favoritedUserId } = await c.req.json();

    if (!favoritedUserId) {
      return c.json({ error: "Favorited User ID is required" }, 400);
    }
    if (favoritedUserId === user.id) {
      return c.json({ error: "You cannot shortlist your own profile" }, 400);
    }

    const db = c.env.DB;

    const target = await db.prepare(`SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id=u.id
      WHERE u.id=? AND u.status='active' AND COALESCE(s.hide_profile,0)=0
        AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE (blocker_id=? AND blocked_id=u.id) OR (blocked_id=? AND blocker_id=u.id))`)
      .bind(favoritedUserId,user.id,user.id).first();
    if(!target)return c.json({error:'This profile is unavailable.'},404);
    await db
      .prepare(
        `INSERT INTO favorites (user_id, favorited_user_id)
         VALUES (?, ?)
         ON CONFLICT(user_id, favorited_user_id) DO NOTHING`
      )
      .bind(user.id, favoritedUserId)
      .run();

    return c.json({ success: true, message: "Matrimonial profile shortlisted successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/favorites - Remove candidate profile from shortlist
app.delete("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const favoritedUserId = c.req.query("favoritedUserId");

    if (!favoritedUserId) {
      return c.json({ error: "Favorited User ID is required" }, 400);
    }

    const db = c.env.DB;
    await db
      .prepare("DELETE FROM favorites WHERE user_id = ? AND favorited_user_id = ?")
      .bind(user.id, favoritedUserId)
      .run();

    return c.json({ success: true, message: "Matrimonial profile removed from shortlist." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
