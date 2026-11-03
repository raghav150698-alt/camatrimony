import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.NEXT_PUBLIC_CLIENT_PREVIEW === "true") return [];
  // No fabricated lastModified dates and no member/search URLs.
  return PUBLIC_PATHS.map(path => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
