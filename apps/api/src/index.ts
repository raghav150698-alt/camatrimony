import { Hono } from "hono";
import { logger } from "hono/logger";

import type { Env, HonoVariables } from "./types";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/error";

// Import all route handlers
import profileRoutes from "./routes/profile";
import profilesRoutes from "./routes/profiles";
import interestsRoutes from "./routes/interests";
import chatRoutes from "./routes/chat";
import favoritesRoutes from "./routes/favorites";
import unlocksRoutes from "./routes/unlocks";
import notificationsRoutes from "./routes/notifications";
import blockRoutes from "./routes/block";
import mediationRoutes from "./routes/mediation";
import reportsRoutes from "./routes/reports";
import supportRoutes from "./routes/support";
import uploadsRoutes from "./routes/uploads";
import paymentsRoutes from "./routes/payments";
import contactRoutes from "./routes/contact";
import userSettingsRoutes from "./routes/user-settings";
import adminRoutes from "./routes/admin";
import storyRoutes from "./routes/stories";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Global middleware
app.use("*", logger());
app.use("*", (c, next) => corsMiddleware(c.env)(c, next));

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "camatrimony-api", version: "0.0.1" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount user routes
app.route("/v1/profile", profileRoutes);
app.route("/v1/profiles", profilesRoutes);
app.route("/v1/interests", interestsRoutes);
app.route("/v1/chat", chatRoutes);
app.route("/v1/favorites", favoritesRoutes);
app.route("/v1/unlocks", unlocksRoutes);
app.route("/v1/notifications", notificationsRoutes);
app.route("/v1/block", blockRoutes);
app.route("/v1/mediation", mediationRoutes);
app.route("/v1/reports", reportsRoutes);
app.route("/v1/support", supportRoutes);
app.route("/v1/uploads", uploadsRoutes);
app.route("/v1/payments", paymentsRoutes);
app.route("/v1/contact", contactRoutes);
app.route("/v1/stories", storyRoutes);
app.route("/v1/user", userSettingsRoutes);

// Mount admin routes
app.route("/v1/admin", adminRoutes);

// Error & not-found handlers
app.onError(errorHandler);
app.notFound(notFoundHandler);

export default app;
