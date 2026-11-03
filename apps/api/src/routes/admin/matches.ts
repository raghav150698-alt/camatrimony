import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import { scorePreferenceMatch } from "@camatrimony/shared";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/matches - Find suggested matches for a specific candidate
app.get("/", requireAdmin, async (c) => {
  try {
    const candidateId = c.req.query("candidateId");

    if (!candidateId) {
      return c.json({ error: "candidateId parameter is required" }, 400);
    }

    const db = c.env.DB;

    const target = await db
      .prepare("SELECT * FROM profiles WHERE user_id = ?")
      .bind(candidateId)
      .first<any>();

    if (!target) {
      return c.json({ error: "Target candidate profile not found." }, 404);
    }

    const oppositeGender = target.gender === "Male" ? "Female" : "Male";

    const rows = await db
      .prepare(
        `SELECT p.*, u.email as user_email
         FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.gender = ? AND u.status = 'active' AND p.user_id != ?
           AND p.user_id NOT IN (
             SELECT blocked_id FROM blocked_users WHERE blocker_id = ?
             UNION SELECT blocker_id FROM blocked_users WHERE blocked_id = ?
           )`
      )
      .bind(oppositeGender, candidateId, candidateId, candidateId)
      .all<any>();

    const candidatesList = rows.results || [];

    const scoredMatches = candidatesList.map((cand: any) => {
      const match = scorePreferenceMatch(target, cand);
      const score = match.score ?? 0;

      return {
        profile: {
          userId: cand.user_id,
          profileCreatedBy: cand.profile_created_by || "Candidate",
          gender: cand.gender,
          age: cand.age,
          maritalStatus: cand.marital_status,
          religion: cand.religion,
          caste: cand.caste,
          highestDegree: cand.highest_degree,
          occupation: cand.occupation,
          annualIncome: cand.annual_income,
          workLocation: cand.work_location,
          isVerified: cand.is_verified === 1,
          aboutMe: cand.about_me,
          userEmail: cand.user_email,
        },
        score,
        match,
      };
    });

    scoredMatches.sort((a, b) => b.score - a.score);

    return c.json({
      success: true,
      targetCandidate: {
        userId: target.user_id,
        profileCreatedBy: target.profile_created_by,
        gender: target.gender,
        age: target.age,
        caste: target.caste,
        highestDegree: target.highest_degree,
        workLocation: target.work_location,
      },
      matches: scoredMatches,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

// POST /v1/admin/matches - Admin manually suggests match connection between two candidates
app.post("/", requireAdmin, async (c) => {
  const admin = c.get("user")!;

  try {
    const { fromUserId, toUserId } = await c.req.json();

    if (!fromUserId || !toUserId) {
      return c.json({ error: "fromUserId and toUserId are required" }, 400);
    }

    const db = c.env.DB;

    const p1 = await db.prepare("SELECT profile_created_by FROM profiles WHERE user_id = ?").bind(fromUserId).first<any>();
    const p2 = await db.prepare("SELECT profile_created_by FROM profiles WHERE user_id = ?").bind(toUserId).first<any>();

    if (!p1 || !p2) {
      return c.json({ error: "One or both candidate profiles not found." }, 404);
    }

    const p1Name = p1.profile_created_by || "Candidate";
    const p2Name = p2.profile_created_by || "Candidate";

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'system', 'Premium Match Recommended! 💖', ?, ?)`
      )
      .bind(fromUserId, `Our administrative matchmakers have suggested a premium match with ${p2Name}. Click to view their profile.`, toUserId)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES (?, 'system', 'Premium Match Recommended! 💖', ?, ?)`
      )
      .bind(toUserId, `Our administrative matchmakers have suggested a premium match with ${p1Name}. Click to view their profile.`, fromUserId)
      .run();

    await db
      .prepare(
        `INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
         VALUES (?, 'MATCH_SUGGESTION', 'user', ?, ?)`
      )
      .bind(admin.id, fromUserId, JSON.stringify({ action: "Suggested manual match connection", withUserId: toUserId, p1Name, p2Name }))
      .run();

    return c.json({ success: true, message: "Successfully dispatched mutual matchmaking recommendations to both candidates." });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
