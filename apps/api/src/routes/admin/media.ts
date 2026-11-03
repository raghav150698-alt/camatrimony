import { Hono } from "hono";
import type { Env, HonoVariables } from "../../types";
import { requireAdmin } from "../../middleware/auth";
import {
  extractUploadKey,
  serveUploadObject,
  uploadToR2,
  generateR2Key,
  getPublicApiBase,
} from "../../lib";
import { validateUploadFile } from "@camatrimony/shared";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
};

function resolveFileMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  return EXT_TO_MIME[ext] || file.type || "";
}

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /v1/admin/media?key=... — Serve KYC / sensitive uploads for admin panel (x-admin-token)
app.get("/", requireAdmin, async (c) => {
  const keyParam = c.req.query("key");
  const key = extractUploadKey(keyParam);

  if (!key) {
    return c.json({ error: "Missing or invalid object key" }, 400);
  }

  try {
    return await serveUploadObject(c.env, key);
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to load file" }, 500);
  }
});

// POST /v1/admin/media — Upload payment proof (or other admin-attached files) for a user
app.post("/", requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as unknown as File | null;
    const userId = String(formData.get("userId") || "").trim();
    const type = String(formData.get("type") || "payment_proof");

    if (!file || !userId) {
      return c.json({ error: "file and userId are required" }, 400);
    }

    if (type !== "payment_proof") {
      return c.json({ error: "Only payment_proof uploads are supported here" }, 400);
    }

    const validationError = validateUploadFile(file, "payment_proof");
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const userRow = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!userRow) {
      return c.json({ error: "Target user not found" }, 404);
    }

    const resolvedMime = resolveFileMime(file);
    if (!ALLOWED_DOC_TYPES.includes(resolvedMime)) {
      return c.json({ error: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF (max 5MB)." }, 400);
    }

    const apiBase = getPublicApiBase(c.env, c.req.url);
    const r2Key = generateR2Key(userId, "payment_proof", file.name);
    const arrayBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToR2(
      c.env.BUCKET,
      arrayBuffer,
      r2Key,
      resolvedMime,
      apiBase
    );

    return c.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      message: "Payment proof uploaded successfully.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Upload failed" }, 500);
  }
});

export default app;
