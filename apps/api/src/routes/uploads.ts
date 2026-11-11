import {photoViewer,maySeePhoto,photoReviewed} from "../services/media-access";
import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { uploadToR2, generateR2Key, getPublicApiBase, ensureUserRecord, extractUploadKey, serveUploadObject } from "../lib";
import { requireAuth } from "../middleware/auth";

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

function isSensitiveUploadKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes("/govt_id/") ||
    k.includes("/degree/") ||
    k.includes("govt_id") ||
    k.includes("degree") ||
    k.includes("payment") ||
    k.includes("proof") ||
    k.includes("/docs/")
  );
}

// GET /v1/uploads - Serves/Proxies objects from R2 (auth required for KYC/docs/proofs)
app.get("/", async (c) => {
  const key = c.req.query("key");

  if (!key) {
    return c.json({ error: "Missing object key parameter" }, 400);
  }

  try {
    const cleanKey = extractUploadKey(key);
    if (!cleanKey) {
      return c.json({ error: "Missing object key parameter" }, 400);
    }

    if(cleanKey.split('/')[1]==='photos') {
      let viewer=await photoViewer(new URL(c.req.url),cleanKey,c.env);
      if(!viewer && c.req.header('Authorization')) {
        const {getAuthenticatedUser}=await import('../middleware/auth');
        const member=await getAuthenticatedUser(c);if(member&&!member.isBanned)viewer=member.id;
      }
      if(!await maySeePhoto(c.env.DB,cleanKey.split('/')[0],viewer) || !await photoReviewed(c.env.DB,cleanKey,viewer)) {
        const {getAdminUser}=await import('../middleware/auth');
        if(!await getAdminUser(c))return c.json({error:'This photo is private or unavailable.'},403);
      }
    }
    if (isSensitiveUploadKey(cleanKey)) {
      const authHeader = c.req.header("Authorization") || "";
      let allowed = false;

      if (authHeader.startsWith("Bearer ")) {
        try {
          const { getAuthenticatedUser, getAdminUser } = await import("../middleware/auth");
          const user = await getAuthenticatedUser(c);
          if (user && !user.isBanned) {
            const isOwner = cleanKey.startsWith(`${user.id}/`);
            const isAdmin = user.role !== "user";
            allowed = isOwner || isAdmin;
          }
          if (!allowed) {
            const adminUser = await getAdminUser(c);
            allowed = !!adminUser;
          }
        } catch {
          allowed = false;
        }
      } else {
        try {
          const { getAdminUser } = await import("../middleware/auth");
          const adminUser = await getAdminUser(c);
          allowed = !!adminUser;
        } catch {
          allowed = false;
        }
      }

      if (!allowed) {
        return c.json({ error: "Authentication required for this file" }, 401);
      }
    }

    const response = await serveUploadObject(c.env, cleanKey);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Cache-Control','private, no-store');
    headers.set('Vary','Authorization, x-admin-token');
    return new Response(response.body,{status:response.status,headers});
  } catch (err: any) {
    return c.json({ error: err?.message || "R2 Serve Error" }, 500);
  }
});

// POST /v1/uploads - Direct writes to Cloudflare R2 storage
app.post("/", requireAuth, async (c) => {
  try {
    const user = c.get("user")!;
    const formData = await c.req.formData();
    const file = formData.get("file") as unknown as File;
    const type =
      (formData.get("type") as "govt_id" | "degree" | "photos" | "payment_proof") || "photos";

    if (!file || typeof file.arrayBuffer !== "function") {
      return c.json({ error: "No file object supplied" }, 400);
    }
    if (!["govt_id", "degree", "photos", "payment_proof"].includes(type)) {
      return c.json({ error: "Invalid upload category." }, 400);
    }

    const allowedTypes =
      type === "photos" || type === "payment_proof" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
    const resolvedMime = resolveFileMime(file);
    if (!allowedTypes.includes(resolvedMime)) {
      return c.json(
        { error: `Invalid file type: ${file.type || resolvedMime || "unknown"}. Allowed: PDF, JPG, JPEG, PNG, WEBP` },
        400
      );
    }

    // Validation check (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({ error: "File size exceeds the 5MB limit." }, 400);
    }

    const bucket = c.env.BUCKET;

    const apiBase = getPublicApiBase(c.env, c.req.url);
    const r2Key = generateR2Key(user.id, type, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToR2(
      bucket,
      arrayBuffer,
      r2Key,
      file.type || resolvedMime || "image/jpeg",
      apiBase
    );

    console.log(`[R2] ${type} upload completed`);

    // Profile photos enter the admin moderation queue as pending
    if (type === "photos") {
      try {
        await ensureUserRecord(c.env.DB, user.id, user.email);
        await c.env.DB.prepare(
          `INSERT INTO photos (user_id, file_url, category, status, visibility)
           VALUES (?, ?, 'profile', 'pending', 'public')`
        )
          .bind(user.id, publicUrl)
          .run();
      } catch (photoErr) {
        console.error("[photos] Failed to enqueue uploaded photo for moderation:", photoErr);
        // Do not fail the upload — R2 write already succeeded
      }
    }

    return c.json({
      success: true,
      fileName: file.name,
      url: publicUrl,
      r2Key,
      message: "Uploaded successfully to Cloudflare R2 bucket.",
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Upload Server Error" }, 500);
  }
});

export default app;
