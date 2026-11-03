import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin, requireSuperAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/packages - List packages (readable by any admin who can assign plans)
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;
    const rows = await db.prepare("SELECT * FROM packages ORDER BY id ASC").all();

    const packages = (rows.results || []).map((p: any) => ({
      ...p,
      features: p.features ? (typeof p.features === "string" ? JSON.parse(p.features) : p.features) : [],
      isActive: p.is_active === 1,
      isCustom: p.is_custom === 1,
      chatAllowed: p.chat_allowed === 1,
    }));

    return c.json({ success: true, packages });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/packages - Create a new package
app.post("/", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { name, price, validityDays, contactLimit, chatAllowed, features, isCustom } = await c.req.json();

    if (!name || price === undefined || !validityDays || contactLimit === undefined) {
      return c.json({ error: "name, price, validityDays, and contactLimit are required" }, 400);
    }

    const db = c.env.DB;

    const featuresJSON = JSON.stringify(features || []);
    const result = await db
      .prepare(
        `INSERT INTO packages (name, price, validity_days, contact_limit, chat_allowed, is_active, is_custom, features)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(name, Number(price), Number(validityDays), Number(contactLimit), chatAllowed === false ? 0 : 1, isCustom ? 1 : 0, featuresJSON)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'CREATE', 'package', ?, ?)`
      )
      .bind(admin.id, String(result.meta?.last_row_id || ""), JSON.stringify({ name, price, validityDays, contactLimit }))
      .run();

    return c.json({ success: true, message: "Package created successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/packages/:id - Update a package
app.patch("/:id", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const db = c.env.DB;

    const pkg = await db.prepare("SELECT * FROM packages WHERE id = ?").bind(Number(id)).first<any>();
    if (!pkg) {
      return c.json({ error: "Package not found" }, 404);
    }

    const name = body.name || pkg.name;
    const price = body.price !== undefined ? Number(body.price) : pkg.price;
    const validityDays = body.validityDays !== undefined ? Number(body.validityDays) : pkg.validity_days;
    const contactLimit = body.contactLimit !== undefined ? Number(body.contactLimit) : pkg.contact_limit;
    const chatAllowed = body.chatAllowed !== undefined ? (body.chatAllowed ? 1 : 0) : pkg.chat_allowed;
    const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : pkg.is_active;
    const features = body.features ? JSON.stringify(body.features) : pkg.features;

    await db
      .prepare(
        `UPDATE packages SET name = ?, price = ?, validity_days = ?, contact_limit = ?, chat_allowed = ?, is_active = ?, features = ? WHERE id = ?`
      )
      .bind(name, price, validityDays, contactLimit, chatAllowed, isActive, features, Number(id))
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'UPDATE', 'package', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify(body))
      .run();

    return c.json({ success: true, message: "Package updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/admin/packages/:id - Delete a package
app.delete("/:id", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    const pkg = await db.prepare("SELECT id FROM packages WHERE id = ?").bind(Number(id)).first();
    if (!pkg) {
      return c.json({ error: "Package not found" }, 404);
    }

    await db.prepare("DELETE FROM packages WHERE id = ?").bind(Number(id)).run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'DELETE', 'package', ?, ?)`
      )
      .bind(admin.id, id, JSON.stringify({ deleted: true }))
      .run();

    return c.json({ success: true, message: "Package deleted successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
