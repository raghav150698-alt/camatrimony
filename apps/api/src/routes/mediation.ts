import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/mediation - List user's mediation requests
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;

    const rows = await db
      .prepare(
        `SELECT m.*,
               p_target.highest_degree as target_degree, p_target.occupation as target_occupation, p_target.work_location as target_location,
               p_req.highest_degree as req_degree, p_req.occupation as req_occupation, p_req.work_location as req_location
         FROM mediation_requests m
         LEFT JOIN profiles p_target ON m.target_user_id = p_target.user_id
         LEFT JOIN profiles p_req ON m.requester_id = p_req.user_id
         WHERE m.requester_id = ? OR m.target_user_id = ?
         ORDER BY m.created_at DESC`
      )
      .bind(user.id, user.id)
      .all();

    return c.json({ success: true, mediationRequests: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/mediation - Request family mediation meeting
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { targetUserId, preferredDate, preferredTime, notes } = await c.req.json();

    if (!targetUserId || !preferredDate || !preferredTime) {
      return c.json({ error: "Missing required fields: targetUserId, preferredDate, preferredTime" }, 400);
    }
    if (targetUserId === user.id) {
      return c.json({ error: "You cannot request family mediation with yourself" }, 400);
    }

    const db = c.env.DB;

    const targetUser = await db
      .prepare("SELECT user_id FROM profiles WHERE user_id = ?")
      .bind(targetUserId)
      .first();

    if (!targetUser) {
      return c.json({ error: "Target candidate profile not found" }, 404);
    }

    await db
      .prepare(
        `INSERT INTO mediation_requests (requester_id, target_user_id, preferred_date, preferred_time, notes, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .bind(user.id, targetUserId, preferredDate, preferredTime, notes || null)
      .run();

    return c.json({
      success: true,
      message: "Family mediation request submitted successfully! An administrator will contact you soon.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
