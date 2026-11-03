import { DEFAULT_API_BASE_URL } from "../constants/config";

/**
 * Turn a stored media path (relative `/v1/uploads?...`, bare R2 key, or absolute URL)
 * into an absolute URL usable from web/admin origins.
 */
export function toAbsoluteMediaUrl(
  url: string | null | undefined,
  apiBase: string = DEFAULT_API_BASE_URL
): string {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const base = apiBase.replace(/\/$/, "");
  const origin = base.replace(/\/v1$/, "");

  if (trimmed.startsWith("/v1/")) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith("/uploads")) {
    return `${base}${trimmed}`;
  }
  // Next.js public assets — keep site-relative (not served by API)
  if (
    trimmed.startsWith("/success_story") ||
    trimmed.startsWith("/logo") ||
    trimmed.startsWith("/fallback") ||
    trimmed.startsWith("/locked-profile")
  ) {
    return trimmed;
  }
  // Already a query-style path without leading slash
  if (trimmed.startsWith("uploads?") || trimmed.startsWith("v1/uploads")) {
    return `${origin}/${trimmed.replace(/^\//, "")}`;
  }
  // Bare R2 object key
  if (trimmed.includes("/") && !trimmed.startsWith("/")) {
    return `${base}/uploads?key=${encodeURIComponent(trimmed)}`;
  }
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/** Human-readable filename for uploaded docs (never show raw URLs in UI). */
export function mediaFileDisplayName(
  url: string | null | undefined,
  explicitName?: string | null,
  fallback = "Uploaded file"
): string {
  if (explicitName && String(explicitName).trim()) return String(explicitName).trim();
  if (!url) return fallback;
  try {
    let path = String(url);
    if (path.includes("key=")) {
      path = decodeURIComponent(path.split("key=")[1].split("&")[0]);
    }
    const part = path.split("/").pop() || fallback;
    return part.replace(/^\d+_/, "") || fallback;
  } catch {
    return fallback;
  }
}

/** Client-side upload limits aligned with API `/v1/uploads`. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export const UPLOAD_DOC_MIME = [...UPLOAD_IMAGE_MIME, "application/pdf"] as const;

export const UPLOAD_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] as const;
export const UPLOAD_DOC_EXT = [...UPLOAD_IMAGE_EXT, ".pdf"] as const;

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
};

export function uploadFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Infer MIME from extension when the browser leaves `file.type` empty (common for .jpeg). */
export function resolveUploadMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  return EXT_TO_MIME[uploadFileExtension(file.name)] || file.type || "";
}

export function isUploadImageMime(mime: string): boolean {
  return (UPLOAD_IMAGE_MIME as readonly string[]).includes(mime);
}

export function isUploadDocMime(mime: string): boolean {
  return (UPLOAD_DOC_MIME as readonly string[]).includes(mime);
}

export function isImageMediaUrl(url: string, fileName?: string | null): boolean {
  const probe = `${fileName || ""} ${url}`.toLowerCase();
  if (/\.(jpe?g|png|webp|heic|heif)(\?|#|$)/i.test(probe)) return true;
  if (/\.pdf(\?|#|$)/i.test(probe)) return false;
  return !/\.pdf/i.test(probe);
}

export function validateUploadFile(
  file: File,
  kind: "photos" | "payment_proof" | "govt_id" | "degree"
): string | null {
  const allowedMime =
    kind === "photos" || kind === "payment_proof" ? UPLOAD_IMAGE_MIME : UPLOAD_DOC_MIME;
  const allowedExt =
    kind === "photos" || kind === "payment_proof" ? UPLOAD_IMAGE_EXT : UPLOAD_DOC_EXT;
  const mime = resolveUploadMime(file);
  const ext = uploadFileExtension(file.name);
  const mimeOk = mime && (allowedMime as readonly string[]).includes(mime);
  const extOk = ext && (allowedExt as readonly string[]).includes(ext);

  if (!mimeOk && !extOk) {
    return kind === "photos" || kind === "payment_proof"
      ? "Choose a JPG, PNG, WEBP or HEIC image (up to 5 MB)."
      : "Choose a PDF, JPG, PNG, WEBP or HEIC file (up to 5 MB).";
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return "File size exceeds the 5MB limit.";
  }
  return null;
}
