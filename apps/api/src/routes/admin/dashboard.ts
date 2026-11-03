import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/dashboard - Aggregated analytics statistics for admin dashboard
app.get("/", requireAdmin, async (c) => {
  try {
    const db = c.env.DB;

    const totalUsersRow = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
    const activeSubsRow = await db
      .prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'")
      .first<{ count: number }>();

    const monthlyRevRow = await db
      .prepare(
        `SELECT SUM(amount) as total
         FROM payments
         WHERE status = 'captured'
           AND created_at >= datetime('now', '-30 days')`
      )
      .first<{ total: number | null }>();

    const monthlyRevenue = (monthlyRevRow?.total || 0) / 100;

    const pendingKYCRow = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending_verification'")
      .first<{ count: number }>();

    const openTicketsRow = await db
      .prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'")
      .first<{ count: number }>();

    const activeMatchesRow = await db
      .prepare("SELECT COUNT(*) as count FROM interest_requests WHERE status = 'accepted'")
      .first<{ count: number }>();

    const recentKYC = await db
      .prepare(
        `SELECT u.id, u.email, u.phone, p.highest_degree, p.occupation, p.created_at, p.govt_id_file, p.degree_file
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.status = 'pending_verification' AND p.govt_id_file IS NOT NULL
         ORDER BY p.created_at ASC
         LIMIT 5`
      )
      .all();

    const recentRegs = await db
      .prepare(
        `SELECT id, email, phone, role, status, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 5`
      )
      .all();

    const recentPayments = await db
      .prepare(
        `SELECT p.*, u.email as user_email
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT 5`
      )
      .all();

    const formattedPayments = (recentPayments.results || []).map((pay: any) => ({
      ...pay,
      amount: pay.amount / 100,
    }));

    const openReports = await db
      .prepare(
        `SELECT r.*, u_rep.email as reporter_email, u_bad.email as reported_email
         FROM reports r
         LEFT JOIN users u_rep ON r.reporter_id = u_rep.id
         LEFT JOIN users u_bad ON r.reported_id = u_bad.id
         WHERE r.status = 'open'
         ORDER BY r.created_at DESC
         LIMIT 5`
      )
      .all();

    const planBreakdown = await db
      .prepare(
        `SELECT pk.name as plan_name, COUNT(us.id) as count
         FROM user_subscriptions us
         LEFT JOIN packages pk ON us.package_id = pk.id
         WHERE us.status = 'active'
         GROUP BY pk.id`
      )
      .all();

    const genderRatio = await db
      .prepare(`SELECT gender, COUNT(*) as count FROM profiles GROUP BY gender`)
      .all();

    const trendRows = await db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) as month_key,
                COUNT(*) as count
         FROM users
         WHERE created_at >= datetime('now', '-12 months')
         GROUP BY month_key
         ORDER BY month_key ASC`
      )
      .all<{ month_key: string; count: number }>();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const registrationTrend = (trendRows.results || []).map((row) => {
      const [, mm] = (row.month_key || "").split("-");
      const idx = Math.max(0, Number(mm || "1") - 1);
      return { month: monthNames[idx] || row.month_key, count: row.count };
    });

    return c.json({
      success: true,
      metrics: {
        totalUsers: totalUsersRow?.count || 0,
        activeSubscriptions: activeSubsRow?.count || 0,
        monthlyRevenue,
        pendingKYC: pendingKYCRow?.count || 0,
        openTickets: openTicketsRow?.count || 0,
        activeMatches: activeMatchesRow?.count || 0,
      },
      recentKYC: recentKYC.results || [],
      recentUsers: recentRegs.results || [],
      recentPayments: formattedPayments,
      recentReports: openReports.results || [],
      charts: {
        planBreakdown: planBreakdown.results || [],
        genderRatio: genderRatio.results || [],
        registrationTrend,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
