import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { requireAuth } from "../middleware/auth";
import { deleteFromR2 } from "../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/user/settings - Fetch user's privacy/notification preferences
app.get("/settings", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const db = c.env.DB;
    const row = await db
      .prepare("SELECT * FROM user_settings WHERE user_id = ?")
      .bind(user.id)
      .first<any>();

    if (!row) {
      // Return defaults
      return c.json({
        success: true,
        settings: {
          hideProfile: false,
          hideContact: false,
          hideIncome: false,
          photoVisibility: "public",
          notifyInterests: true,
          notifyMessages: true,
          notifyKyc: true,
          notifyPayments: true,
        },
      });
    }

    return c.json({
      success: true,
      settings: {
        hideProfile: row.hide_profile === 1,
        hideContact: row.hide_contact === 1,
        hideIncome: row.hide_income === 1,
        photoVisibility: row.photo_visibility || "public",
        notifyInterests: row.notify_interests === 1,
        notifyMessages: row.notify_messages === 1,
        notifyKyc: row.notify_kyc === 1,
        notifyPayments: row.notify_payments === 1,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/user/settings - Update privacy/notification preferences
app.patch("/settings", requireAuth, async (c) => {
  const user = c.get("user")!;

  try {
    const body = await c.req.json();
    const db = c.env.DB;

    const existing = await db.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(user.id).first<any>();
    const flag = (input: unknown, current: number | undefined, fallback: number): number =>
      input === undefined ? current ?? fallback : input === true ? 1 : 0;
    const hideProfile = flag(body.hideProfile, existing?.hide_profile, 0);
    const hideContact = flag(body.hideContact, existing?.hide_contact, 0);
    const hideIncome = flag(body.hideIncome, existing?.hide_income, 0);
    const photoVisibility = body.photoVisibility ?? existing?.photo_visibility ?? "public";
    if (!["public", "private", "members", "premium"].includes(photoVisibility)) return c.json({ error: "Invalid photo visibility" }, 400);
    const notifyInterests = flag(body.notifyInterests, existing?.notify_interests, 1);
    const notifyMessages = flag(body.notifyMessages, existing?.notify_messages, 1);
    const notifyKyc = flag(body.notifyKyc, existing?.notify_kyc, 1);
    const notifyPayments = flag(body.notifyPayments, existing?.notify_payments, 1);

    await db
      .prepare(
        `INSERT INTO user_settings (
          user_id, hide_profile, hide_contact, hide_income, photo_visibility,
          notify_interests, notify_messages, notify_kyc, notify_payments, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           hide_profile = excluded.hide_profile,
           hide_contact = excluded.hide_contact,
           hide_income = excluded.hide_income,
           photo_visibility = excluded.photo_visibility,
           notify_interests = excluded.notify_interests,
           notify_messages = excluded.notify_messages,
           notify_kyc = excluded.notify_kyc,
           notify_payments = excluded.notify_payments,
           updated_at = datetime('now')`
      )
      .bind(
        user.id,
        hideProfile,
        hideContact,
        hideIncome,
        photoVisibility,
        notifyInterests,
        notifyMessages,
        notifyKyc,
        notifyPayments
      )
      .run();

    return c.json({ success: true, message: "Settings updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/user/account - Permanently delete user account and all associated data
// Cascades across all user-owned tables, deletes R2 files (photos, govt ID, degree),
// and removes the users table row. Firebase auth user record remains (requires
// Firebase Admin SDK to delete, which is not available in Workers edge runtime).
// The user is effectively logged out client-side after this call succeeds.
app.delete("/account", requireAuth, async (c) => {
  const user = c.get("user")!;
  const userId = user.id;

  try {
    const db = c.env.DB;
    const bucket = c.env.BUCKET;

    // 1. Fetch profile to get R2 file keys for cleanup
    const profile = await db
      .prepare("SELECT photos, govt_id_file, degree_file FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ photos: string | null; govt_id_file: string | null; degree_file: string | null }>();

    // 2. Delete R2 objects (photos, govt ID, degree certificate)
    if (bucket) {
      const r2Keys: string[] = [];

      if (profile?.govt_id_file) {
        const key = profile.govt_id_file.includes("key=")
          ? decodeURIComponent(profile.govt_id_file.split("key=")[1])
          : profile.govt_id_file;
        if (key) r2Keys.push(key);
      }
      if (profile?.degree_file) {
        const key = profile.degree_file.includes("key=")
          ? decodeURIComponent(profile.degree_file.split("key=")[1])
          : profile.degree_file;
        if (key) r2Keys.push(key);
      }
      if (profile?.photos) {
        try {
          const photos = JSON.parse(profile.photos) as string[];
          for (const photoUrl of photos) {
            if (photoUrl.includes("key=")) {
              r2Keys.push(decodeURIComponent(photoUrl.split("key=")[1]));
            } else if (photoUrl.startsWith("photos/")) {
              r2Keys.push(photoUrl);
            }
          }
        } catch {
          // photos JSON may be malformed; skip
        }
      }

      // Also delete any photos from the photos table
      const photoRows = await db
        .prepare("SELECT file_url FROM photos WHERE user_id = ?")
        .bind(userId)
        .all<{ file_url: string }>();

      for (const row of photoRows.results) {
        if (row.file_url?.includes("key=")) {
          r2Keys.push(decodeURIComponent(row.file_url.split("key=")[1]));
        } else if (row.file_url) {
          r2Keys.push(row.file_url);
        }
      }

      // Delete all R2 objects (best-effort, don't fail the request if some fail)
      await Promise.allSettled(r2Keys.map((key) => deleteFromR2(bucket, key)));
    }

    // 3. Delete all user-owned rows from D1 tables
    // Order: child tables first, then parent
    await db.prepare("DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM interest_requests WHERE sender_id = ? OR receiver_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM favorites WHERE user_id = ? OR favorited_user_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM notifications WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM contact_unlocks WHERE user_id = ? OR unlocked_user_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM reports WHERE reporter_id = ? OR reported_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM mediation_requests WHERE requester_id = ? OR target_user_id = ?").bind(userId, userId).run();
    await db.prepare("DELETE FROM support_tickets WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM photos WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM user_subscriptions WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM payments WHERE user_id = ?").bind(userId).run();
    await db.prepare("DELETE FROM profiles WHERE user_id = ?").bind(userId).run();
    // Delete admin_roles entry if it exists (in case user was an admin)
    await db.prepare("DELETE FROM admin_roles WHERE user_id = ?").bind(userId).run();
    // Finally, delete the users table row
    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

    return c.json({
      success: true,
      message: "Account permanently deleted. All profile data, photos, government ID documents, messages, and payment records have been removed.",
    });
  } catch (err: any) {
    console.error("Account deletion failed for user:", userId, err);
    return c.json({ error: err?.message || "Failed to delete account. Please contact support." }, 500);
  }
});

export default app;
