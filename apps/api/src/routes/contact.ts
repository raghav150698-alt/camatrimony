import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// POST /v1/contact - Contact form submission, saves to contact_submissions table
app.post("/", async (c) => {
  try {
    const { name, email, phone, subject, message } = await c.req.json();

    if (!name || !email || !subject || !message) {
      return c.json({ error: "name, email, subject, and message are required" }, 400);
    }

    const db = c.env.DB;

    await db
      .prepare(
        `INSERT INTO contact_submissions (name, email, phone, subject, message, status)
         VALUES (?, ?, ?, ?, ?, 'new')`
      )
      .bind(name, email, phone || null, subject, message)
      .run();

    return c.json({
      success: true,
      message: "Your message has been received. Our team will get back to you shortly.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Server Error" }, 500);
  }
});

export default app;
