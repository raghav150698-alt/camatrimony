import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requirePermission } from "../../middleware/auth";
import { sendTemplatedEmail, getPublicApiBase, absolutizeMediaUrl, logAdminAudit } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const KYC_SELECT = `SELECT p.user_id, p.profile_created_by, p.highest_degree, p.occupation,
                p.govt_id_file, p.degree_file, p.govt_id_status, p.degree_status,
                p.is_verified, p.created_at,
                u.email, u.phone, u.status
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id`;

type KycDocument = "govt_id" | "degree";

function docColumns(document: KycDocument) {
  return document === "govt_id"
    ? { file: "govt_id_file", status: "govt_id_status", label: "Government ID" }
    : { file: "degree_file", status: "degree_status", label: "Degree certificate" };
}

function effectiveDocStatus(file: string | null | undefined, status: string | null | undefined): string | null {
  if (!file) return null;
  return status || "pending";
}

function allUploadedDocsApproved(row: {
  govt_id_file?: string | null;
  degree_file?: string | null;
  govt_id_status?: string | null;
  degree_status?: string | null;
}): { ok: boolean; message?: string } {
  const checks: boolean[] = [];
  if (row.govt_id_file) {
    checks.push(effectiveDocStatus(row.govt_id_file, row.govt_id_status) === "approved");
  }
  if (row.degree_file) {
    checks.push(effectiveDocStatus(row.degree_file, row.degree_status) === "approved");
  }
  if (checks.length === 0) {
    return { ok: false, message: "No KYC documents uploaded yet." };
  }
  if (!checks.every(Boolean)) {
    return { ok: false, message: "Approve each uploaded document before final KYC approval." };
  }
  return { ok: true };
}

function mapKycRow(row: any, apiBase: string) {
  const govtId = absolutizeMediaUrl(row.govt_id_file, apiBase) || null;
  const degree = absolutizeMediaUrl(row.degree_file, apiBase) || null;
  return {
    user_id: row.user_id,
    userId: row.user_id,
    name: row.profile_created_by || (row.email ? String(row.email).split("@")[0] : "Candidate"),
    email: row.email,
    phone: row.phone,
    status: row.status,
    is_verified: row.is_verified,
    highest_degree: row.highest_degree,
    occupation: row.occupation,
    govt_id_file: govtId,
    idFile: govtId,
    govt_id_status: row.govt_id_status || (govtId ? "pending" : null),
    govtIdStatus: row.govt_id_status || (govtId ? "pending" : null),
    degree_file: degree,
    degreeFile: degree,
    degree_status: row.degree_status || (degree ? "pending" : null),
    degreeStatus: row.degree_status || (degree ? "pending" : null),
    created_at: row.created_at,
    submittedAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-IN")
      : null,
  };
}

function statusClause(status: string): { where: string; params: any[] } {
  const hasDocs = `(p.govt_id_file IS NOT NULL OR p.degree_file IS NOT NULL)`;

  if (status === "approved") {
    return { where: `p.is_verified = 1`, params: [] };
  }

  if (status === "rejected") {
    // No dedicated kyc_status column — approximate via REJECT_KYC audit entries
    // for profiles that are still unverified.
    return {
      where: `p.is_verified = 0 AND ${hasDocs}
        AND EXISTS (
          SELECT 1 FROM admin_audit_log a
          WHERE a.target_id = p.user_id
            AND a.action_type = 'REJECT_KYC'
            AND a.target_type = 'kyc'
        )`,
      params: [],
    };
  }

  // pending (default): all unverified profiles that have submitted docs
  return {
    where: `p.is_verified = 0 AND ${hasDocs}`,
    params: [],
  };
}

// GET /v1/admin/kyc - List KYC submissions filtered by status tab
app.get("/", requirePermission("kyc"), async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.max(1, Number(c.req.query("limit") || "20"));
  const offset = (page - 1) * limit;
  const status = (c.req.query("status") || "pending").toLowerCase();

  try {
    const db = c.env.DB;
    const { where, params } = statusClause(status);

    const countRow = await db
      .prepare(`SELECT COUNT(*) as count FROM profiles p LEFT JOIN users u ON p.user_id = u.id WHERE ${where}`)
      .bind(...params)
      .first<{ count: number }>();

    const totalItems = countRow?.count || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const rows = await db
      .prepare(
        `${KYC_SELECT}
         WHERE ${where}
         ORDER BY p.created_at ${status === "approved" ? "DESC" : "ASC"}
         LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all();

    const apiBase = getPublicApiBase(c.env, c.req.url);
    const kycRequests = (rows.results || []).map((row) => mapKycRow(row, apiBase));

    return c.json({
      success: true,
      kycRequests,
      pagination: { currentPage: page, totalPages, totalItems, pageSize: limit },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/kyc/:id/approve-doc - Approve a single KYC document (govt_id or degree)
app.post("/:id/approve-doc", requirePermission("kyc"), async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const { document } = await c.req.json();
    if (document !== "govt_id" && document !== "degree") {
      return c.json({ error: "Invalid document type. Use govt_id or degree." }, 400);
    }

    const db = c.env.DB;
    const cols = docColumns(document as KycDocument);

    const row = await db
      .prepare(`SELECT ${cols.file} as file, ${cols.status} as status FROM profiles WHERE user_id = ?`)
      .bind(userId)
      .first<{ file: string | null; status: string | null }>();

    if (!row?.file) {
      return c.json({ error: `${cols.label} has not been uploaded.` }, 400);
    }

    if (effectiveDocStatus(row.file, row.status) === "approved") {
      return c.json({ success: true, message: `${cols.label} is already approved.`, document, status: "approved" });
    }

    await db
      .prepare(`UPDATE profiles SET ${cols.status} = 'approved' WHERE user_id = ?`)
      .bind(userId)
      .run();

    await logAdminAudit(db, admin, {
      action_type: "VERIFY_KYC_DOC",
      target_type: "kyc",
      target_id: userId,
      details: { document, status: "approved" },
    });

    return c.json({
      success: true,
      message: `${cols.label} approved successfully.`,
      document,
      status: "approved",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/kyc/:id/approve - Approve KYC verification
app.post("/:id/approve", requirePermission("kyc"), async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const db = c.env.DB;

    const profileRow = await db
      .prepare(
        `SELECT govt_id_file, degree_file, govt_id_status, degree_status, is_verified
         FROM profiles WHERE user_id = ?`
      )
      .bind(userId)
      .first<any>();

    if (!profileRow) {
      return c.json({ error: "Candidate profile not found." }, 404);
    }

    const docCheck = allUploadedDocsApproved(profileRow);
    if (!docCheck.ok) {
      return c.json({ error: docCheck.message }, 400);
    }

    await db.prepare("UPDATE profiles SET is_verified = 1 WHERE user_id = ?").bind(userId).run();

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string | null }>();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'kyc', 'Profile Verified! ✅', 'Congratulations! Your CA Matrimony verification has been approved.')`
      )
      .bind(userId)
      .run();

    if (userRow?.email) {
      sendTemplatedEmail(c.env, userRow.email, "kyc_approved", { name: "Candidate" }).catch(console.error);
    }

    await logAdminAudit(db, admin, {
      action_type: "VERIFY_KYC",
      target_type: "kyc",
      target_id: userId,
      details: { status: "approved" },
    });

    return c.json({ success: true, message: "KYC ID Verification approved successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/kyc/:id/reject - Reject KYC verification
app.post("/:id/reject", requirePermission("kyc"), async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const { reason } = await c.req.json();
    const db = c.env.DB;

    await db.prepare("UPDATE profiles SET is_verified = 0 WHERE user_id = ?").bind(userId).run();
    await db
      .prepare(
        `UPDATE profiles
         SET govt_id_status = CASE WHEN govt_id_file IS NOT NULL THEN 'pending' ELSE govt_id_status END,
             degree_status = CASE WHEN degree_file IS NOT NULL THEN 'pending' ELSE degree_status END
         WHERE user_id = ?`
      )
      .bind(userId)
      .run();
    await db.prepare("UPDATE users SET status = 'pending_verification' WHERE id = ?").bind(userId).run();

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string | null }>();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'kyc', 'Verification Rejected ⚠️', ?)`
      )
      .bind(userId, `Profile verification needs resubmission: ${reason || "Blurry or mismatching documents."}`)
      .run();

    if (userRow?.email) {
      sendTemplatedEmail(c.env, userRow.email, "kyc_rejected", {
        name: "Candidate",
        reason: reason || "Discrepancy with uploaded academic or ID credentials.",
      }).catch(console.error);
    }

    await logAdminAudit(db, admin, {
      action_type: "REJECT_KYC",
      target_type: "kyc",
      target_id: userId,
      details: { status: "rejected", reason },
    });

    return c.json({ success: true, message: "KYC verification rejected. User notified to resubmit." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/kyc/:id/request-docs - Request additional documents from user
app.post("/:id/request-docs", requirePermission("kyc"), async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const { message } = await c.req.json();
    const db = c.env.DB;

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'kyc', 'Additional Documents Required 📋', ?)`
      )
      .bind(userId, message || "Please upload additional verification documents to complete your KYC review.")
      .run();

    await logAdminAudit(db, admin, {
      action_type: "REQUEST_DOCS",
      target_type: "kyc",
      target_id: userId,
      details: { message },
    });

    return c.json({ success: true, message: "Document request notification sent to user." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
