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
                p.religion, p.caste, p.highest_degree, p.occupation, p.annual_income, p.work_location,
                p.city, p.state, p.country, p.photos, p.is_verified, p.is_featured, p.about_me, p.last_active_at
         FROM favorites f
         LEFT JOIN profiles p ON f.favorited_user_id = p.user_id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`
      )
      .bind(user.id)
      .all();

    const results = (rows.results || []).map((row: any) => ({ ...row, photos: parsePhotos(row.photos) }));

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
