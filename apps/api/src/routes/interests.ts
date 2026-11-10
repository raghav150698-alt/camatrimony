import {signProfilePhotos} from "../services/media-access";
import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import { sendTemplatedEmail, parsePhotos } from "../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Intentionally omit users.email — contact PII is only via /v1/unlocks after balance spend.
const INTEREST_SELECT_SENT = `SELECT i.*, p.full_name, p.gender, p.age, p.highest_degree, p.occupation, CASE WHEN privacy.hide_income=1 THEN NULL ELSE p.annual_income END AS annual_income, p.work_location, CASE WHEN privacy.photo_visibility IN ('private','premium') THEN '[]' ELSE p.photos END AS photos, p.is_verified
           FROM interest_requests i
           LEFT JOIN profiles p ON i.receiver_id = p.user_id
           JOIN users u ON u.id=p.user_id
           LEFT JOIN user_settings privacy ON privacy.user_id=p.user_id
           WHERE i.sender_id = ? AND u.status='active' AND COALESCE(privacy.hide_profile,0)=0
             AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
               (b.blocker_id=i.sender_id AND b.blocked_id=i.receiver_id) OR (b.blocker_id=i.receiver_id AND b.blocked_id=i.sender_id))
           ORDER BY i.created_at DESC`;

const INTEREST_SELECT_RECEIVED = `SELECT i.*, p.full_name, p.gender, p.age, p.highest_degree, p.occupation, CASE WHEN privacy.hide_income=1 THEN NULL ELSE p.annual_income END AS annual_income, p.work_location, CASE WHEN privacy.photo_visibility IN ('private','premium') THEN '[]' ELSE p.photos END AS photos, p.is_verified
           FROM interest_requests i
           LEFT JOIN profiles p ON i.sender_id = p.user_id
           JOIN users u ON u.id=p.user_id
           LEFT JOIN user_settings privacy ON privacy.user_id=p.user_id
           WHERE i.receiver_id = ? AND u.status='active' AND COALESCE(privacy.hide_profile,0)=0
             AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
               (b.blocker_id=i.sender_id AND b.blocked_id=i.receiver_id) OR (b.blocker_id=i.receiver_id AND b.blocked_id=i.sender_id))
           ORDER BY i.created_at DESC`;

// GET /v1/interests - List sent, received, or all interests
app.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const direction = c.req.query("direction") || "received";

  try {
    const db = c.env.DB;
    let results: any[] = [];

    if (direction === "sent" || direction === "all") {
      const rows = await db.prepare(INTEREST_SELECT_SENT).bind(user.id).all();
      results = results.concat(rows.results || []);
    }
    if (direction === "received" || direction === "all") {
      const rows = await db.prepare(INTEREST_SELECT_RECEIVED).bind(user.id).all();
      results = results.concat(rows.results || []);
    }
    if (direction !== "sent" && direction !== "received" && direction !== "all") {
      const rows = await db.prepare(INTEREST_SELECT_RECEIVED).bind(user.id).all();
      results = rows.results || [];
    }

    const mapped = await Promise.all(results.map((row:any)=>signProfilePhotos({...row,photos:parsePhotos(row.photos)},user.id,c.env,c.req.url)));

    return c.json({ success: true, interests: mapped });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/interests - Express interest in a candidate profile
app.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const { receiverId, message } = await c.req.json();

    if (typeof receiverId !== "string" || !receiverId) {
      return c.json({ error: "Receiver User ID is required" }, 400);
    }
    if (receiverId === user.id) {
      return c.json({ error: "You cannot express interest in your own profile" }, 400);
    }

    if(message != null && (typeof message !== 'string' || message.length > 1000))return c.json({error:'Keep your message within 1000 characters.'},400);
    const db = c.env.DB;

    const recipient = await db
      .prepare("SELECT u.email FROM users u LEFT JOIN user_settings s ON s.user_id=u.id WHERE u.id = ? AND u.status='active' AND COALESCE(s.hide_profile,0)=0")
      .bind(receiverId)
      .first<{ email: string | null }>();

    if (!recipient) {
      return c.json({ error: "Recipient user not found" }, 404);
    }

    const isBlocked = await db
      .prepare("SELECT blocker_id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)")
      .bind(user.id, receiverId, receiverId, user.id)
      .first();

    if (isBlocked) {
      return c.json({ error: "Unable to express interest. Candidate connection unavailable." }, 403);
    }

    const existing = await db.prepare(`SELECT id,status FROM interest_requests WHERE
      (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)`).bind(user.id,receiverId,receiverId,user.id).first<{id:number;status:string}>();
    if(existing)return c.json({success:true,message:existing.status==='accepted'?'You are already connected.':'An interest already exists.',interestId:existing.id});
    await db.prepare(`INSERT INTO interest_requests(sender_id,receiver_id,status,message) VALUES(?,?,'pending',?)`)
      .bind(user.id,receiverId,message?.trim()||null).run();

    const senderProfile = await db
      .prepare("SELECT highest_degree FROM profiles WHERE user_id = ?")
      .bind(user.id)
      .first<{ highest_degree: string }>();

    const senderDegree = senderProfile?.highest_degree || "CA Candidate";

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'interest', 'New Match Interest Received!', ?, ?)`
      )
      .bind(receiverId, `A matching candidate (${senderDegree}) has expressed interest in your profile.`, user.id)
      .run();

    if (recipient.email) {
      sendTemplatedEmail(c.env, recipient.email, "interest_received", {
        name: "Candidate",
        senderDegree,
      }).catch(console.error);
    }

    return c.json({
      success: true,
      message: "Interest expressed successfully! Notification sent to the candidate.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/interests/:id - Accept or Decline interest expression
app.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  try {
    const { status } = await c.req.json();

    if (status !== "accepted" && status !== "declined") {
      return c.json({ error: "Invalid action status. Must be accepted or declined." }, 400);
    }

    const db = c.env.DB;

    const interest = await db
      .prepare("SELECT * FROM interest_requests WHERE id = ?")
      .bind(id)
      .first<{ id: number; sender_id: string; receiver_id: string; status: string }>();

    if (!interest) {
      return c.json({ error: "Match interest request not found" }, 404);
    }

    if (interest.receiver_id !== user.id) {
      return c.json({ error: "Forbidden: you can only respond to match interests sent to you" }, 403);
    }

    if(interest.status !== 'pending')return c.json({error:'This interest has already been answered.'},409);
    const blocked=await db.prepare(`SELECT 1 FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)`)
      .bind(user.id,interest.sender_id,interest.sender_id,user.id).first();
    if(blocked)return c.json({error:'This connection is unavailable.'},403);
    await db
      .prepare("UPDATE interest_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, id)
      .run();

    if (status === "accepted") {
      const sender = await db
        .prepare("SELECT email FROM users WHERE id = ?")
        .bind(interest.sender_id)
        .first<{ email: string | null }>();

      const receiverProfile = await db
        .prepare("SELECT highest_degree FROM profiles WHERE user_id = ?")
        .bind(user.id)
        .first<{ highest_degree: string }>();

      const receiverName = receiverProfile?.highest_degree
        ? `CA Candidate (${receiverProfile.highest_degree})`
        : "Matching Candidate";

      await db
        .prepare(
          `INSERT INTO notifications (user_id, type, title, body, reference_id)
           VALUES (?, 'interest', 'Interest Accepted! 🎉', ?, ?)`
        )
        .bind(interest.sender_id, `A matching candidate (${receiverName}) has accepted your interest. You can now chat!`, user.id)
        .run();

      if (sender?.email) {
        sendTemplatedEmail(c.env, sender.email, "interest_accepted", {
          name: "Candidate",
          receiverName,
        }).catch(console.error);
      }
    }

    return c.json({
      success: true,
      message: `Match interest has been successfully ${status}.`,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/interests/:id - Withdraw/Delete a sent interest
app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  try {
    const db = c.env.DB;

    const interest = await db
      .prepare("SELECT * FROM interest_requests WHERE id = ?")
      .bind(id)
      .first<{ id: number; sender_id: string; receiver_id: string }>();

    if (!interest) {
      return c.json({ error: "Match interest request not found" }, 404);
    }

    if (interest.sender_id !== user.id) {
      return c.json({ error: "Forbidden: you can only withdraw interests sent by you" }, 403);
    }

    await db.prepare("DELETE FROM interest_requests WHERE id = ?").bind(id).run();

    return c.json({ success: true, message: "Match interest withdrawn successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
