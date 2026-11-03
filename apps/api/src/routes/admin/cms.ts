import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/cms - Fetch global branding settings and success stories
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const configRows = await db.prepare("SELECT * FROM cms_settings").all<any>();
    const configMap: Record<string, string> = {};
    (configRows.results || []).forEach((row: any) => {
      configMap[row.setting_key] = row.setting_value;
    });

    const storyRows = await db.prepare("SELECT * FROM success_stories ORDER BY created_at DESC").all<any>();

    return c.json({
      success: true,
      settings: configMap,
      successStories: storyRows.results || [],
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/cms - Add or delete success stories, or bulk save branding
app.post("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { action, key, value, storyId, brideName, groomName, weddingDate, description, image } = await c.req.json();
    const db = c.env.DB;

    // Action 1: Add new success story
    if (action === "addStory") {
      if (!brideName || !groomName || !description) {
        return c.json({ error: "brideName, groomName, and description are required" }, 400);
      }

      await db
        .prepare(
          `INSERT INTO success_stories (bride_name, groom_name, wedding_date, description, image_url)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(brideName, groomName, weddingDate || null, description, image || null)
        .run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
           VALUES (?, 'CREATE_STORY', 'cms', ?)`
        )
        .bind(admin.id, JSON.stringify({ action: "Added success story", brideName, groomName }))
        .run();

      return c.json({ success: true, message: "Success story successfully published!" });
    }

    // Action 2: Delete success story
    if (action === "deleteStory") {
      if (!storyId) {
        return c.json({ error: "storyId is required" }, 400);
      }

      await db.prepare("DELETE FROM success_stories WHERE id = ?").bind(storyId).run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
           VALUES (?, 'DELETE_STORY', 'cms', ?)`
        )
        .bind(admin.id, JSON.stringify({ action: "Deleted success story", storyId }))
        .run();

      return c.json({ success: true, message: "Success story deleted." });
    }

    // Action 3: Save individual global configuration key
    if (action === "saveConfig") {
      if (!key || value === undefined) {
        return c.json({ error: "key and value are required" }, 400);
      }

      await db
        .prepare("INSERT OR REPLACE INTO cms_settings (setting_key, setting_value) VALUES (?, ?)")
        .bind(key, value.toString())
        .run();

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
           VALUES (?, 'UPDATE_CMS', 'cms', ?)`
        )
        .bind(admin.id, JSON.stringify({ action: "Updated CMS Setting", key, value }))
        .run();

      return c.json({ success: true, message: `Configuration "${key}" saved.` });
    }

    return c.json({ error: "Invalid action specified" }, 400);
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/cms/stories - Add a success story (dedicated endpoint)
app.post("/stories", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { brideName, groomName, weddingDate, description, image, location, isFeatured } = await c.req.json();
    const db = c.env.DB;

    if (!brideName || !groomName || !description) {
      return c.json({ error: "brideName, groomName, and description are required" }, 400);
    }

    await db
      .prepare(
        `INSERT INTO success_stories (bride_name, groom_name, wedding_date, location, description, image_url, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(brideName, groomName, weddingDate || null, location || null, description, image || null, isFeatured ? 1 : 0)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
         VALUES (?, 'CREATE_STORY', 'cms', ?)`
      )
      .bind(admin.id, JSON.stringify({ action: "Added success story", brideName, groomName }))
      .run();

    return c.json({ success: true, message: "Success story successfully published!" });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/cms/stories/:id - Update a success story
app.patch("/stories/:id", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const db = c.env.DB;

    const story = await db.prepare("SELECT * FROM success_stories WHERE id = ?").bind(Number(id)).first<any>();
    if (!story) {
      return c.json({ error: "Success story not found" }, 404);
    }

    await db
      .prepare(
        `UPDATE success_stories SET
          bride_name = ?, groom_name = ?, wedding_date = ?, location = ?, description = ?, image_url = ?, is_featured = ?
         WHERE id = ?`
      )
      .bind(
        body.brideName || story.bride_name,
        body.groomName || story.groom_name,
        body.weddingDate || story.wedding_date,
        body.location || story.location,
        body.description || story.description,
        body.image || story.image_url,
        body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : story.is_featured,
        Number(id)
      )
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'UPDATE_STORY', 'cms', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify(body))
      .run();

    return c.json({ success: true, message: "Success story updated." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/admin/cms/stories/:id - Delete a success story
app.delete("/stories/:id", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    await db.prepare("DELETE FROM success_stories WHERE id = ?").bind(Number(id)).run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, details)
         VALUES (?, 'DELETE_STORY', 'cms', ?)`
      )
      .bind(admin.id, JSON.stringify({ action: "Deleted success story", storyId: id }))
      .run();

    return c.json({ success: true, message: "Success story deleted." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
