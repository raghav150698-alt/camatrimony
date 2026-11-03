import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";

import authRoutes from "./auth";
import dashboardRoutes from "./dashboard";
import usersRoutes from "./users";
import kycRoutes from "./kyc";
import packagesRoutes from "./packages";
import subscriptionsRoutes from "./subscriptions";
import paymentsRoutes from "./payments";
import matchesRoutes from "./matches";
import moderationRoutes from "./moderation";
import mediationRoutes from "./mediation";
import photosRoutes from "./photos";
import cmsRoutes from "./cms";
import auditRoutes from "./audit";
import rolesRoutes from "./roles";
import emailRoutes from "./email";
import settingsRoutes from "./settings";
import communicationRoutes from "./communication";
import supportRoutes from "./support";
import mediaRoutes from "./media";

const admin = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Mount all admin routes
admin.route("/auth", authRoutes);
admin.route("/dashboard", dashboardRoutes);
admin.route("/users", usersRoutes);
admin.route("/kyc", kycRoutes);
admin.route("/packages", packagesRoutes);
admin.route("/subscriptions", subscriptionsRoutes);
admin.route("/payments", paymentsRoutes);
admin.route("/matches", matchesRoutes);
admin.route("/moderation", moderationRoutes);
admin.route("/mediation", mediationRoutes);
admin.route("/photos", photosRoutes);
admin.route("/cms", cmsRoutes);
admin.route("/audit", auditRoutes);
admin.route("/roles", rolesRoutes);
admin.route("/email", emailRoutes);
admin.route("/settings", settingsRoutes);
admin.route("/communication", communicationRoutes);
admin.route("/support", supportRoutes);
admin.route("/media", mediaRoutes);

export default admin;
