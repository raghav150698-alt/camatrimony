import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/support - List user's support tickets
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const rows = await db
      .prepare(
        `SELECT * FROM support_tickets
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all();

    const tickets = (rows.results || []).map((t: any) => ({
      ...t,
      messages: t.messages ? (typeof t.messages === "string" ? JSON.parse(t.messages) : t.messages) : [],
    }));

    return c.json({ success: true, tickets });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/support - Create a support ticket
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { subject, category, priority, message } = await c.req.json();

    if (!subject || !category || !message) {
      return c.json({ error: "subject, category, and message are required" }, 400);
    }

    const db = c.env.DB;

    const now = new Date().toISOString();
    const messages = JSON.stringify([{ sender: "user", text: message, sent_at: now }]);

    const result = await db
      .prepare(
        `INSERT INTO support_tickets (user_id, subject, category, priority, status, messages)
         VALUES (?, ?, ?, ?, 'open', ?)`
      )
      .bind(user.id, subject, category, priority || "medium", messages)
      .run();

    return c.json({
      success: true,
      ticketId: result.meta?.last_row_id,
      message: "Support ticket created successfully. Our team will respond shortly.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/support/:id/message - Add a message to a support ticket
app.post("/:id/message", requireAuth, async (c) => {
  const user = c.get("user")!;
  const ticketId = c.req.param("id");

  try {
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const db = c.env.DB;

    const ticket = await db
      .prepare("SELECT user_id, messages FROM support_tickets WHERE id = ?")
      .bind(ticketId)
      .first<{ user_id: string; messages: string | null }>();

    if (!ticket) {
      return c.json({ error: "Support ticket not found" }, 404);
    }

    if (ticket.user_id !== user.id) {
      return c.json({ error: "Forbidden: you can only message your own tickets" }, 403);
    }

    const existingMessages = ticket.messages
      ? typeof ticket.messages === "string"
        ? JSON.parse(ticket.messages)
        : ticket.messages
      : [];

    const now = new Date().toISOString();
    existingMessages.push({ sender: "user", text: message, sent_at: now });

    await db
      .prepare("UPDATE support_tickets SET messages = ?, status = 'open' WHERE id = ?")
      .bind(JSON.stringify(existingMessages), ticketId)
      .run();

    return c.json({ success: true, message: "Message added to support ticket." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
