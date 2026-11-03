import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/support - List all support tickets
app.get("/", requireAdmin, async (c) => {
  const status = c.req.query("status");
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.max(1, Number(c.req.query("limit") || "20"));
  const offset = (page - 1) * limit;

  try {
    const db = c.env.DB;

    let query = `SELECT st.*, u.email as user_email FROM support_tickets st LEFT JOIN users u ON st.user_id = u.id`;
    const params: any[] = [];

    if (status) {
      query += " WHERE st.status = ?";
      params.push(status);
    }

    query += " ORDER BY st.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = await db.prepare(query).bind(...params).all();

    const tickets = (rows.results || []).map((t: any) => ({
      ...t,
      messages: t.messages ? (typeof t.messages === "string" ? JSON.parse(t.messages) : t.messages) : [],
    }));

    return c.json({ success: true, tickets });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/support - Admin update support ticket (status, assign, reply)
app.patch("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { ticketId, status, assignedTo, replyMessage, adminNotes, priority } = await c.req.json();
    const db = c.env.DB;

    if (!ticketId) {
      return c.json({ error: "ticketId is required" }, 400);
    }

    const ticket = await db
      .prepare("SELECT * FROM support_tickets WHERE id = ?")
      .bind(ticketId)
      .first<any>();

    if (!ticket) {
      return c.json({ error: "Support ticket not found" }, 404);
    }

    // If replying, append to messages
    if (replyMessage) {
      const existingMessages = ticket.messages
        ? typeof ticket.messages === "string"
          ? JSON.parse(ticket.messages)
          : ticket.messages
        : [];

      existingMessages.push({
        sender: "admin",
        text: replyMessage,
        sent_at: new Date().toISOString(),
        adminId: admin.id,
      });

      await db
        .prepare("UPDATE support_tickets SET messages = ? WHERE id = ?")
        .bind(JSON.stringify(existingMessages), ticketId)
        .run();

      // Notify user
      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body)
           VALUES (?, 'system', 'Support Ticket Updated 💬', ?)`
        )
        .bind(ticket.user_id, `An admin has replied to your support ticket: ${replyMessage.substring(0, 100)}`)
        .run();
    }

    // Update status/assignment/priority
    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (assignedTo) {
      updates.push("assigned_to = ?");
      params.push(assignedTo);
    }
    if (adminNotes) {
      updates.push("admin_notes = ?");
      params.push(adminNotes);
    }
    if (priority) {
      updates.push("priority = ?");
      params.push(priority);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(ticketId);
      await db.prepare(`UPDATE support_tickets SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    }

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'UPDATE_TICKET', 'support', ?, ?)`
      )
      .bind(admin.id, String(ticketId), JSON.stringify({ status, assignedTo, priority, replied: !!replyMessage }))
      .run();

    return c.json({ success: true, message: "Support ticket updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
