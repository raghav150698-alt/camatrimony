/**
 * Cloudflare R2 Object Storage Utility.
 * Integrates directly with R2Bucket binding ("env.BUCKET") in the Cloudflare Pages Edge runtime.
 */

export interface R2Bucket {
  put: (key: string, value: any, options?: any) => Promise<any>;
  get: (key: string) => Promise<any>;
  delete: (key: string) => Promise<any>;
}

/**
 * Uploads a file (File, Blob, or ArrayBuffer) directly to Cloudflare R2.
 */
export async function uploadToR2(
  bucket: R2Bucket | undefined,
  fileData: ArrayBuffer | Blob | string,
  key: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, ""); // strip leading slash

  if (!bucket) {
    throw new Error("R2 bucket binding is not configured");
  }

  try {
    await bucket.put(cleanKey, fileData, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    // Returns public URL mapping to pages project domain
    // R2 assets are proxied through standard path or direct subdomain
    return `/api/v1/uploads?key=${encodeURIComponent(cleanKey)}`;
  } catch (err: any) {
    console.error(`R2 PUT upload failed for key: ${cleanKey}`, err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudflare R2 bucket.
 */
export async function deleteFromR2(bucket: R2Bucket | undefined, key: string): Promise<boolean> {
  const cleanKey = key.replace(/^\/+/, "");

  if (!bucket) {
    throw new Error("R2 bucket binding is not configured");
  }

  try {
    await bucket.delete(cleanKey);
    return true;
  } catch (err) {
    console.error(`R2 delete failed for key: ${cleanKey}`, err);
    return false;
  }
}

/**
 * Helper to generate a unique object key to avoid naming conflicts.
 */
export function generateR2Key(
  userId: string,
  category: "govt_id" | "degree" | "photos" | "payment_proof",
  originalName: string
): string {
  const timestamp = Date.now();
  const ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
  const safeName = originalName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 15)
    .toLowerCase();
  return `${userId}/${category}/${timestamp}_${safeName}${ext}`;
}
