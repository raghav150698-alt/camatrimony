import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from '../middleware/rate-limit';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/reports - List own reports filed by the user
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const rows = await db
      .prepare(
        `SELECT r.*
         FROM reports r
         WHERE r.reporter_id = ?
         ORDER BY r.created_at DESC`
      )
      .bind(user.id)
      .all();

    return c.json({ success: true, reports: rows.results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/reports - Submit a report against a user
app.post("/", requireAuth, rateLimit({windowMs: 3600000, max: 10, keyBy: 'user'}), async (c) => {
  const user = c.get("user")!;

  try {
    const { reportedId, reason, details, severity } = await c.req.json();

    if (!reportedId || !reason) {
      return c.json({ error: "reportedId and reason are required" }, 400);
    }
    if (reportedId === user.id) {
      return c.json({ error: "You cannot report yourself" }, 400);
    }

    const db = c.env.DB;

    // Verify reported user exists
    const reported = await db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(reportedId)
      .first();

    if (!reported) {
      return c.json({ error: "Reported user not found" }, 404);
    }

    await db
      .prepare(
        `INSERT INTO reports (reporter_id, reported_id, reason, details, severity, status)
         VALUES (?, ?, ?, ?, ?, 'open')`
      )
      .bind(user.id, reportedId, reason, details || null, severity || "medium")
      .run();

    return c.json({
      success: true,
      message: "Report submitted successfully. Our moderation team will review it shortly.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
