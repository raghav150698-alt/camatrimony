import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import { deleteFromR2, getPublicApiBase, absolutizeMediaUrl } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/photos - Photo approval queue
app.get("/", requireAdmin, async (c) => {
  const status = c.req.query("status") || "pending";

  try {
    const db = c.env.DB;
    const apiBase = getPublicApiBase(c.env, c.req.url);

    const rows = await db
      .prepare(
        `SELECT ph.*, u.email as user_email, p.gender, p.highest_degree
         FROM photos ph
         LEFT JOIN users u ON ph.user_id = u.id
         LEFT JOIN profiles p ON ph.user_id = p.user_id
         WHERE ph.status = ?
         ORDER BY ph.created_at DESC`
      )
      .bind(status)
      .all();

    const photos = (rows.results || []).map((ph: any) => ({
      ...ph,
      file_url: absolutizeMediaUrl(ph.file_url, apiBase) || ph.file_url,
    }));

    return c.json({ success: true, photos });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/photos/:id/approve - Approve a photo
app.post("/:id/approve", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    const photo = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(Number(id)).first<any>();
    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    await db.prepare("UPDATE photos SET status = 'approved', rejection_reason = NULL WHERE id = ?").bind(Number(id)).run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'APPROVE_PHOTO', 'photo', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify({ photoId: id, userId: photo.user_id }))
      .run();

    return c.json({ success: true, message: "Photo approved successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/photos/:id/reject - Reject a photo
app.post("/:id/reject", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const { reason } = await c.req.json();
    const db = c.env.DB;

    const photo = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(Number(id)).first<any>();
    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    await db
      .prepare("UPDATE photos SET status = 'rejected', rejection_reason = ? WHERE id = ?")
      .bind(reason || "Photo does not meet guidelines.", Number(id))
      .run();

    // Notify user
    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'system', 'Photo Rejected ⚠️', ?)`
      )
      .bind(photo.user_id, `One of your photos was rejected: ${reason || "Does not meet community guidelines."}`)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'REJECT_PHOTO', 'photo', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify({ photoId: id, userId: photo.user_id, reason }))
      .run();

    return c.json({ success: true, message: "Photo rejected and user notified." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/admin/photos/:id - Delete a photo (from DB and R2)
app.delete("/:id", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    const photo = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(Number(id)).first<any>();
    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    // Delete from R2
    if (photo.file_url) {
      const key = photo.file_url.replace(/^\/+/, "").replace(/^v1\/uploads\?key=/, "");
      await deleteFromR2(c.env.BUCKET, key);
    }

    await db.prepare("DELETE FROM photos WHERE id = ?").bind(Number(id)).run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'DELETE_PHOTO', 'photo', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify({ photoId: id, userId: photo.user_id }))
      .run();

    return c.json({ success: true, message: "Photo deleted successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/photos/:id/visibility - Update photo visibility
app.patch("/:id/visibility", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const { visibility, password } = await c.req.json();
    const db = c.env.DB;

    const photo = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(Number(id)).first<any>();
    if (!photo) {
      return c.json({ error: "Photo not found" }, 404);
    }

    let passwordHash = null;
    if (visibility === "password_protected" && password) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
      passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    await db
      .prepare("UPDATE photos SET visibility = ?, password_hash = ? WHERE id = ?")
      .bind(visibility || "public", passwordHash, Number(id))
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'UPDATE_PHOTO', 'photo', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify({ photoId: id, visibility }))
      .run();

    return c.json({ success: true, message: "Photo visibility updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
