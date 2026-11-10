import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/chat - Retrieve message exchanges between two users
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const senderId = c.req.query("senderId");
  const recipientId = c.req.query("recipientId");

  if (!senderId || !recipientId) {
    return c.json({ error: "senderId and recipientId params are required" }, 400);
  }

  if (user.id !== senderId && user.id !== recipientId) {
    return c.json({ error: "Forbidden: you can only view your own conversations" }, 403);
  }

  try {
    const db = c.env.DB;
    const gate = await canMessage(db,user.id,user.id===senderId?recipientId:senderId);
    if(!gate.ok)return c.json({error:gate.reason},403);
    const { results } = await db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND recipient_id = ?)
            OR (sender_id = ? AND recipient_id = ?)
         ORDER BY sent_at ASC`
      )
      .bind(senderId, recipientId, recipientId, senderId)
      .all();

    return c.json({ success: true, messages: results || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// GET /v1/chat/conversations - Returns recent conversations with last message + unread count
app.get("/conversations", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const { results } = await db
      .prepare(
        `SELECT
           other_user.id AS userId,
           p.gender,
           p.highest_degree,
           p.occupation,
           p.photos,
           p.is_verified,
           last_msg.content AS lastMessage,
           last_msg.sent_at AS lastMessageAt,
           last_msg.sender_id AS lastMessageSenderId,
           (SELECT COUNT(*) FROM messages m
            WHERE m.sender_id = other_user.id AND m.recipient_id = ? AND m.is_read = 0) AS unreadCount
         FROM (
           SELECT
             CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id,
             MAX(id) AS max_id
           FROM messages
           WHERE sender_id = ? OR recipient_id = ?
           GROUP BY other_id
         ) conv
         JOIN messages last_msg ON last_msg.id = conv.max_id
         JOIN users other_user ON other_user.id = conv.other_id
         LEFT JOIN profiles p ON p.user_id = other_user.id
         LEFT JOIN user_settings privacy ON privacy.user_id=other_user.id
         WHERE other_user.status='active' AND COALESCE(privacy.hide_profile,0)=0
           AND NOT EXISTS(SELECT 1 FROM blocked_users b WHERE (b.blocker_id=? AND b.blocked_id=other_user.id) OR (b.blocked_id=? AND b.blocker_id=other_user.id))
         ORDER BY last_msg.sent_at DESC`
      )
       .bind(user.id, user.id, user.id, user.id, user.id, user.id)
      .all<any>();

    // Do not return email here — accepted interest unlocks chat but not contact PII.
    const conversations = (results || []).map((row: any) => ({
      userId: row.userId,
      gender: row.gender,
      highestDegree: row.highest_degree,
      occupation: row.occupation,
      isVerified: row.is_verified === 1,
      lastMessage: row.lastMessage,
      lastMessageAt: row.lastMessageAt,
      lastMessageSenderId: row.lastMessageSenderId,
      unreadCount: row.unreadCount || 0,
    }));

    return c.json({ success: true, conversations });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

async function canMessage(db: D1Database, senderId: string, recipientId: string): Promise<{ ok: boolean; reason?: string }> {
  const recipient=await db.prepare(`SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id=u.id
    WHERE u.id=? AND u.status='active' AND COALESCE(s.hide_profile,0)=0`).bind(recipientId).first();
  if(!recipient)return {ok:false,reason:'This profile is unavailable.'};
  const blocked = await db
    .prepare(
      `SELECT 1 FROM blocked_users
       WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
       LIMIT 1`
    )
    .bind(senderId, recipientId, recipientId, senderId)
    .first();
  if (blocked) {
    return { ok: false, reason: "Messaging is unavailable for this profile." };
  }

  const unlocked = await db
    .prepare(
      `SELECT 1 FROM contact_unlocks
       WHERE (user_id = ? AND unlocked_user_id = ?) OR (user_id = ? AND unlocked_user_id = ?)
       LIMIT 1`
    )
    .bind(senderId, recipientId, recipientId, senderId)
    .first();
  if (unlocked) return { ok: true };

  const accepted = await db
    .prepare(
      `SELECT 1 FROM interest_requests
       WHERE status = 'accepted'
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`
    )
    .bind(senderId, recipientId, recipientId, senderId)
    .first();
  if (accepted) return { ok: true };

  return {
    ok: false,
    reason: "Chat requires an accepted mutual interest or an unlocked contact.",
  };
}

// POST /v1/chat - Save a new chat message
app.post("/", requireAuth, async (c) => {
  try {
    const user = c.get("user")!;
    const body = await c.req.json();
    const { recipientId, content } = body;

    if (typeof recipientId !== "string" || typeof content !== "string" || !content.trim() || content.length > 4000) {
      return c.json({ error: "Missing recipientId or content" }, 400);
    }

    if (recipientId === user.id) {
      return c.json({ error: "Cannot send message to yourself" }, 400);
    }

    const db = c.env.DB;
    const gate = await canMessage(db, user.id, recipientId);
    if (!gate.ok) {
      return c.json({ error: gate.reason }, 403);
    }

    await db
      .prepare("INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)")
      .bind(user.id, recipientId, content.trim())
      .run();

    return c.json({
      success: true,
      message: "Message sent.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/chat/:id/read - Mark message as read
app.patch("/:id/read", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    const msg = await db
      .prepare("SELECT recipient_id FROM messages WHERE id = ?")
      .bind(id)
      .first<{ recipient_id: string }>();

    if (!msg) {
      return c.json({ error: "Message not found" }, 404);
    }

    if (msg.recipient_id !== user.id) {
      return c.json({ error: "Forbidden: you can only mark your own received messages as read" }, 403);
    }

    await db.prepare("UPDATE messages SET is_read = 1 WHERE id = ?").bind(id).run();

    return c.json({ success: true, message: "Message marked as read." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
