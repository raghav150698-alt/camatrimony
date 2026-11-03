/**
 * Cloudflare R2 Object Serving Utility.
 * Serves R2 objects with proper content-type and cache-control headers.
 * Designed for use in Cloudflare Pages/Workers edge functions.
 */

import type { R2Bucket } from "./r2-upload";

// MIME type mapping for common file extensions
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

// Cache control settings by file category
const CACHE_CONTROL: Record<string, string> = {
  photos: "public, max-age=31536000, immutable",
  govt_id: "private, max-age=31536000, immutable",
  degree: "private, max-age=31536000, immutable",
  default: "public, max-age=31536000",
};

/**
 * Gets the content-type for a given file key based on its extension.
 */
export function getContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Gets the appropriate cache-control header value based on the file path category.
 */
export function getCacheControl(key: string): string {
  const cleanKey = key.toLowerCase();
  if (cleanKey.includes("photos")) return CACHE_CONTROL.photos;
  if (cleanKey.includes("govt_id")) return CACHE_CONTROL.govt_id;
  if (cleanKey.includes("degree")) return CACHE_CONTROL.degree;
  return CACHE_CONTROL.default;
}

/**
 * Serves an R2 object as a Response with proper headers.
 * Returns a 404 response if the object is not found.
 *
 * @param bucket - The R2 bucket binding
 * @param key - The object key to serve
 * @returns A Response with the object data and proper headers
 */
export async function serveR2Object(
  bucket: R2Bucket | undefined,
  key: string
): Promise<Response> {
  const cleanKey = key.replace(/^\/+/, "");

  if (!bucket) {
    // Mock mode: return a placeholder response
    console.log(`[MOCK R2 SERVE] Serving mock object for key: ${cleanKey}`);
    return new Response("Mock R2 object content", {
      status: 200,
      headers: {
        "Content-Type": getContentType(cleanKey),
        "Cache-Control": getCacheControl(cleanKey),
        "X-Mock-Mode": "true",
      },
    });
  }

  try {
    const object = await bucket.get(cleanKey);

    if (!object) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", getContentType(cleanKey));
    headers.set("Cache-Control", getCacheControl(cleanKey));
    headers.set("ETag", object.httpEtag || "");

    // Add content disposition for downloadable files (govt_id, degree)
    if (cleanKey.includes("govt_id") || cleanKey.includes("degree")) {
      const fileName = cleanKey.substring(cleanKey.lastIndexOf("/") + 1);
      headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error(`R2 serve failed for key: ${cleanKey}`, err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Serves an R2 object as a Response with range request support.
 * Useful for serving media files (videos, large images).
 */
export async function serveR2ObjectWithRange(
  bucket: R2Bucket | undefined,
  key: string,
  rangeHeader: string | null
): Promise<Response> {
  const cleanKey = key.replace(/^\/+/, "");

  if (!bucket || !rangeHeader) {
    return serveR2Object(bucket, cleanKey);
  }

  try {
    const object = await bucket.get(cleanKey);

    if (!object) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Parse range header (e.g., "bytes=0-1023")
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (!rangeMatch) {
      return serveR2Object(bucket, cleanKey);
    }

    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;

    const headers = new Headers();
    headers.set("Content-Type", getContentType(cleanKey));
    headers.set("Cache-Control", getCacheControl(cleanKey));
    headers.set("Accept-Ranges", "bytes");

    // For R2, we can use the range option in get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rangedObject = await (bucket as any).get(cleanKey, {
      range: { offset: start, length: end ? end - start + 1 : undefined },
    });

    if (!rangedObject) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response(rangedObject.body, {
      status: 206,
      headers,
    });
  } catch (err) {
    console.error(`R2 range serve failed for key: ${cleanKey}`, err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
