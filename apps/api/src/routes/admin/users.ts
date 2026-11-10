import {subscriptionView} from "../../services/subscriptions";
import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin, requireSuperAdmin } from "../../middleware/auth";
import { parsePhotosAbsolute, getPublicApiBase, absolutizeMediaUrl } from "../../lib";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/users - List all users with advanced filters & pagination
app.get("/", requireAdmin, async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.max(1, Number(c.req.query("limit") || "10"));
  const offset = (page - 1) * limit;

  const search = c.req.query("search") || "";
  const gender = c.req.query("gender") || "";
  const status = c.req.query("status") || "";
  const verification = c.req.query("verification") || "";
  const qualification = c.req.query("qualification") || "";
  const sort = c.req.query("sort") || "";
  const orderRaw = (c.req.query("order") || "desc").toLowerCase();
  const order = orderRaw === "asc" ? "ASC" : "DESC";

  // Whitelist sortable columns (UI key → SQL expression)
  const SORT_MAP: Record<string, string> = {
    name: "COALESCE(p.full_name, u.email)",
    email: "u.email",
    status: "u.status",
    profile: "p.age",
    age: "p.age",
    registered_at: "u.created_at",
    created_at: "u.created_at",
  };
  const orderByExpr = SORT_MAP[sort] || "u.created_at";

  try {
    const db = c.env.DB;

    let queryBase = `FROM users u LEFT JOIN profiles p ON u.id = p.user_id`;
    const bindings: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push(
        "(u.id LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR p.full_name LIKE ? OR p.caste LIKE ? OR p.occupation LIKE ? OR p.work_location LIKE ?)"
      );
      const term = `%${search}%`;
      bindings.push(term, term, term, term, term, term, term);
    }
    if (gender) {
      conditions.push("p.gender = ?");
      bindings.push(gender);
    }
    if (status) {
      conditions.push("u.status = ?");
      bindings.push(status);
    }
    if (verification === "verified") {
      conditions.push("p.is_verified = 1");
    } else if (verification === "unverified") {
      conditions.push("p.is_verified = 0");
    }
    if (qualification) {
      conditions.push("p.highest_degree LIKE ?");
      bindings.push(`%${qualification}%`);
    }

    if (conditions.length > 0) {
      queryBase += " WHERE " + conditions.join(" AND ");
    }

    const countRow = await db
      .prepare(`SELECT COUNT(*) as count ${queryBase}`)
      .bind(...bindings)
      .first<{ count: number }>();

    const totalItems = countRow?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const sql = `
      SELECT u.id, u.email, u.phone, u.role, u.status, u.created_at as registered_at, u.last_login_at,
             p.full_name, p.gender, p.age, p.highest_degree, p.occupation, p.annual_income, p.work_location, p.is_verified, p.is_featured, p.photos, p.completion_percentage, p.is_onboarding_completed,
             (
               SELECT pk.name
               FROM user_subscriptions us
               LEFT JOIN packages pk ON us.package_id = pk.id
               WHERE us.user_id = u.id AND us.status = 'active' AND julianday(us.start_date)<=julianday('now') AND julianday(us.end_date)>julianday('now')
               ORDER BY us.start_date DESC
               LIMIT 1
             ) as plan_name
      ${queryBase}
      ORDER BY ${orderByExpr} ${order}
      LIMIT ? OFFSET ?
    `;

    const dataBindings = [...bindings, limit, offset];
    const rows = await db.prepare(sql).bind(...dataBindings).all();

    const apiBase = getPublicApiBase(c.env, c.req.url);
    const results = (rows.results || []).map((row: any) => ({
      ...row,
      photos: parsePhotosAbsolute(row.photos, apiBase),
      govt_id_file: absolutizeMediaUrl(row.govt_id_file, apiBase) || null,
      degree_file: absolutizeMediaUrl(row.degree_file, apiBase) || null,
    }));

    return c.json({
      success: true,
      users: results,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/users - Admin manually create new user account
app.post("/", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { email, phone, gender, age, highestDegree, occupation, annualIncome, workLocation, caste } = await c.req.json();

    if (!email || !phone || !gender || !age || !highestDegree || !occupation || !annualIncome || !workLocation || !caste) {
      return c.json({ error: "Missing required profile registration parameters" }, 400);
    }

    const db = c.env.DB;

    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ? OR phone = ?")
      .bind(email, phone)
      .first();

    if (existing) {
      return c.json({ error: "A candidate account with this email or phone already exists." }, 400);
    }

    const dummyId = crypto.randomUUID();

    await db
      .prepare("INSERT INTO users (id, email, phone, role, status) VALUES (?, ?, ?, 'user', 'active')")
      .bind(dummyId, email, phone)
      .run();

    await db
      .prepare(
        `INSERT INTO profiles (
          user_id, profile_created_by, gender, diet, age, height, marital_status,
          religion, caste, highest_degree, employed_in, occupation, annual_income,
          work_location, is_nri, completion_percentage, is_verified, photos
        ) VALUES (
          ?, 'Admin', ?, 'Vegetarian', ?, '5ft 6in', 'Never Married',
          'Hindu', ?, ?, 'Private Sector', ?, ?, ?, 0, 80, 1, '[]'
        )`
      )
      .bind(dummyId, gender, Number(age), caste, highestDegree, occupation, annualIncome, workLocation)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'CREATE', 'user', ?, ?)`
      )
      .bind(admin.id, dummyId, JSON.stringify({ action: "Admin Created User Account", email, phone }))
      .run();

    return c.json({
      success: true,
      userId: dummyId,
      message: "Matrimonial candidate account created successfully by admin.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// GET /v1/admin/users/:id - Fetch single user's detailed profile workspace
app.get("/:id", requireAdmin, async (c) => {
  const userId = c.req.param("id");

  try {
    const db = c.env.DB;

    const row = await db
      .prepare(
        `SELECT p.*, u.email as user_email, u.phone as user_phone, u.role as user_role, u.status as user_status,
               u.banned_at, u.ban_reason, u.notes as admin_notes, u.strikes, u.login_count, u.last_login_at
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ?`
      )
      .bind(userId)
      .first<any>();

    if (!row) {
      return c.json({ error: "Candidate profile not found." }, 404);
    }

    const apiBase = getPublicApiBase(c.env, c.req.url);
    const formattedProfile = {
      ...row,
      photos: parsePhotosAbsolute(row.photos, apiBase),
      govt_id_file: absolutizeMediaUrl(row.govt_id_file, apiBase) || null,
      degree_file: absolutizeMediaUrl(row.degree_file, apiBase) || null,
      govt_id_status: row.govt_id_file ? row.govt_id_status || "pending" : null,
      degree_status: row.degree_file ? row.degree_status || "pending" : null,
      // camelCase aliases for admin UI consistency
      govtIdFile: absolutizeMediaUrl(row.govt_id_file, apiBase) || null,
      degreeFile: absolutizeMediaUrl(row.degree_file, apiBase) || null,
      govtIdStatus: row.govt_id_file ? row.govt_id_status || "pending" : null,
      degreeStatus: row.degree_file ? row.degree_status || "pending" : null,
      fullName: row.full_name,
      highestDegree: row.highest_degree,
      isOnboardingCompleted: row.is_onboarding_completed === 1,
      partnerAgeRange: row.partner_age_range,
      partnerCaste: row.partner_caste,
      partnerEducation: row.partner_education,
      partnerIncomeMin: row.partner_income_min,
    };

    const subscriptions = await db
      .prepare(
        `SELECT us.*, pk.name as plan_name, pk.price as plan_price
         FROM user_subscriptions us
         LEFT JOIN packages pk ON us.package_id = pk.id
         WHERE us.user_id = ?
         ORDER BY us.start_date DESC`
      )
      .bind(userId)
      .all();

    const payments = await db
      .prepare(
        `SELECT p.*, pk.name as plan_name
         FROM payments p
         LEFT JOIN packages pk ON p.package_id = pk.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC`
      )
      .bind(userId)
      .all();

    const formattedPayments = (payments.results || []).map((pay: any) => ({ ...pay, amount: pay.amount / 100 }));

    const unlocks = await db
      .prepare(
        `SELECT cu.*, p.gender, p.highest_degree, p.occupation, p.work_location, p.is_verified, u.email as target_email
         FROM contact_unlocks cu
         LEFT JOIN profiles p ON cu.unlocked_user_id = p.user_id
         LEFT JOIN users u ON cu.unlocked_user_id = u.id
         WHERE cu.user_id = ?
         ORDER BY cu.unlocked_at DESC`
      )
      .bind(userId)
      .all();

    const reportsAgainst = await db
      .prepare(
        `SELECT r.*, u.email as reporter_email
         FROM reports r
         LEFT JOIN users u ON r.reporter_id = u.id
         WHERE r.reported_id = ?
         ORDER BY r.created_at DESC`
      )
      .bind(userId)
      .all();

    const interestsSent = await db
      .prepare(
        `SELECT i.*, p.highest_degree, p.occupation, u.email as target_email
         FROM interest_requests i
         LEFT JOIN profiles p ON i.receiver_id = p.user_id
         LEFT JOIN users u ON i.receiver_id = u.id
         WHERE i.sender_id = ?`
      )
      .bind(userId)
      .all();

    const interestsReceived = await db
      .prepare(
        `SELECT i.*, p.highest_degree, p.occupation, u.email as target_email
         FROM interest_requests i
         LEFT JOIN profiles p ON i.sender_id = p.user_id
         LEFT JOIN users u ON i.sender_id = u.id
         WHERE i.receiver_id = ?`
      )
      .bind(userId)
      .all();

    return c.json({
      success: true,
      profile: formattedProfile,
      subscriptions: (subscriptions.results || []).map((row:any)=>subscriptionView({...row,package_name:row.plan_name})),
      payments: formattedPayments,
      unlocks: unlocks.results || [],
      reports: reportsAgainst.results || [],
      activity: {
        interestsSent: interestsSent.results || [],
        interestsReceived: interestsReceived.results || [],
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// PATCH /v1/admin/users/:id - Admin edit status, ban, suspend, notes, or role
app.patch("/:id", requireAdmin, async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const { status, banReason, adminNotes, strikes, role } = await c.req.json();
    const db = c.env.DB;

    const userRow = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<{ id: string; role: string; status: string }>();

    if (!userRow) {
      return c.json({ error: "User not found." }, 404);
    }

    if(userRow.role!=='user' && admin.role!=='super_admin')return c.json({error:'Only a super administrator can change staff accounts.'},403);
    if(userId===admin.id && role && role!=='super_admin')return c.json({error:'You cannot revoke your own administrator access.'},400);
    // 1. Check if modifying Roles (Requires Super Admin!)
    if (role && role !== userRow.role) {
      // Verify super admin permission
      if (admin.role !== "super_admin") {
        return c.json({ error: "Forbidden: Super Admin privileges required to modify roles" }, 403);
      }

      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();

      if (role === "admin" || role === "super_admin" || role === "moderator" || role === "support_agent") {
        const assignedRole = role === "admin" ? "super_admin" : role;
        await db
          .prepare(
            `INSERT INTO admin_roles (user_id, role, assigned_by)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               role = excluded.role,
               assigned_by = excluded.assigned_by`
          )
          .bind(userId, assignedRole, admin.id)
          .run();
      } else {
        await db.prepare("DELETE FROM admin_roles WHERE user_id = ?").bind(userId).run();
      }

      await db
        .prepare(
          `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
           VALUES (?, 'PLAN_ASSIGN', 'user', ?, ?)`
        )
        .bind(admin.id, userId, JSON.stringify({ roleRevocation: role }))
        .run();
    }

    if(role && admin.role==='super_admin'){
      if(role==='user')await db.prepare(`UPDATE admin_accounts SET is_active=0 WHERE id=? OR supabase_subject IN
        (SELECT subject FROM auth_identities WHERE provider='supabase' AND user_id=?)`).bind(userId,userId).run();
      else await db.prepare(`UPDATE admin_accounts SET role=? WHERE id=? OR supabase_subject IN
        (SELECT subject FROM auth_identities WHERE provider='supabase' AND user_id=?)`).bind(role,userId,userId).run();
    }
    // 2. Perform regular updates
    const newStatus = status || userRow.status;

    if (newStatus === "active" && newStatus !== userRow.status) {
      const profileRow = await db
        .prepare("SELECT is_verified FROM profiles WHERE user_id = ?")
        .bind(userId)
        .first<{ is_verified: number }>();

      if (!profileRow || profileRow.is_verified !== 1) {
        return c.json(
          { error: "KYC must be approved before activating this account." },
          400
        );
      }
    }

    let bannedAt = null;
    if (newStatus === "banned") {
      bannedAt = new Date().toISOString();
    }

    await db
      .prepare(
        `UPDATE users
         SET status = ?,
             banned_at = COALESCE(?, banned_at),
             ban_reason = COALESCE(?, ban_reason),
             notes = COALESCE(?, notes),
             strikes = COALESCE(?, strikes)
         WHERE id = ?`
      )
      .bind(newStatus, bannedAt, banReason || null, adminNotes || null, strikes !== undefined ? Number(strikes) : null, userId)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, ?, 'user', ?, ?)`
      )
      .bind(
        admin.id,
        newStatus === "banned" ? "BAN" : "UPDATE",
        userId,
        JSON.stringify({ status: newStatus, strikes: strikes !== undefined ? Number(strikes) : undefined, banReason, adminNotes })
      )
      .run();

    return c.json({ success: true, message: "Matrimonial candidate account details updated successfully." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// DELETE /v1/admin/users/:id - Super Admin permanently delete user account
app.delete("/:id", requireSuperAdmin, async (c) => {
  const admin = c.get("user")!;
  const userId = c.req.param("id");

  try {
    const db = c.env.DB;

    const userRow = await db
      .prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string | null }>();

    if (!userRow) {
      return c.json({ error: "User account not found" }, 404);
    }

    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'DELETE', 'user', ?, ?)`
      )
      .bind(admin.id, userId, JSON.stringify({ email: userRow.email, deletedBy: admin.id }))
      .run();

    return c.json({
      success: true,
      message: "Matrimonial candidate account and all associated profile records permanently deleted.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
