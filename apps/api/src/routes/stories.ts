import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();
// Only stories explicitly featured by the CMS are publicly listed.
app.get("/", async c => {
  const result = await c.env.DB.prepare(`SELECT id, bride_name, groom_name, wedding_date, location, description, image_url
    FROM success_stories WHERE is_featured = 1 ORDER BY created_at DESC LIMIT 30`).all();
  return c.json({ success: true, stories: result.results || [] });
});
export default app;
