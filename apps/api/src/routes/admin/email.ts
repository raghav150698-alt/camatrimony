import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import { sendTemplatedEmail, type EmailTemplate } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// POST /v1/admin/email - Send promotional or system templated emails (bulk or individual)
app.post("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { recipientType, targetUserId, templateName, customReason } = await c.req.json();

    if (!templateName) {
      return c.json({ error: "templateName is required" }, 400);
    }

    const db = c.env.DB;
    let recipients: { id: string; email: string; name: string }[] = [];

    if (recipientType === "single") {
      if (!targetUserId) {
        return c.json({ error: "targetUserId is required for single mailing" }, 400);
      }

      const user = await db
        .prepare(
          `SELECT u.id, u.email, p.profile_created_by
           FROM users u
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.id = ?`
        )
        .bind(targetUserId)
        .first<any>();

      if (!user) {
        return c.json({ error: "Recipient user not found" }, 404);
      }

      recipients.push({
        id: user.id,
        email: user.email,
        name: user.profile_created_by || "Member",
      });
    } else if (recipientType === "bulk_active") {
      const rows = await db
        .prepare(
          `SELECT u.id, u.email, p.profile_created_by
           FROM users u
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.status = 'active' AND u.role != 'admin' AND u.role != 'super_admin'`
        )
        .all<any>();

      recipients = (rows.results || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.profile_created_by || "Member",
      }));
    } else {
      return c.json({ error: "Invalid recipientType specified" }, 400);
    }

    if (recipients.length === 0) {
      return c.json({ error: "No matching candidate recipients found for email dispatch" }, 404);
    }

    let successCount = 0;
    for (const r of recipients) {
      try {
        const vars: Record<string, string | number> = {
          name: r.name,
          reason: customReason || "Standard admin communication alert.",
          daysRemaining: 7,
          packageName: "Platinum Pack",
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN"),
          contactLimit: 100,
          paymentId: "TXN_MOCK_" + Math.random().toString(36).substring(7).toUpperCase(),
          amount: "4,999",
          orderId: "ORD_" + Math.random().toString(36).substring(7).toUpperCase(),
        };

        const sent = await sendTemplatedEmail(c.env, r.email, templateName as EmailTemplate, vars);
        if (sent) {
          successCount++;
          await db
            .prepare(
              `INSERT INTO notifications (user_id, type, title, body)
               VALUES (?, 'system', 'Administrative E-Alert Dispatched 📧', ?)`
            )
            .bind(r.id, `An administrative email update ("${templateName.replace(/_/g, " ")}") was sent to your registered inbox.`)
            .run();
        }
      } catch (err) {
        console.error(`Bulk mailing failed for ${r.email}:`, err);
      }
    }

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'EMAIL_BROADCAST', 'system', 'multiple', ?)`
      )
      .bind(
        admin.id,
        JSON.stringify({
          action: "Broadcasting Templated Email",
          templateName,
          recipientType,
          totalRecipientsCount: recipients.length,
          deliveredSuccessfullyCount: successCount,
        })
      )
      .run();

    return c.json({
      success: true,
      message: `Successfully processed email dispatch. Sent ${successCount} out of ${recipients.length} messages.`,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
