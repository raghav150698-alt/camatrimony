import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_CLIENT_PREVIEW === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    // Do not disallow account pages here: crawlers must read their noindex tags.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
