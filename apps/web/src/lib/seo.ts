import type { Metadata } from "next";

export const SITE_URL = "https://camatrimonybncn.com";
export const SITE_NAME = "CA Matrimony BNCN";
export const HOME_TITLE = "CA Matrimony for Chartered Accountants, CS & CMA | BNCN";
export const HOME_DESCRIPTION = "Meet professionals looking for a life partner. Discover personalized matrimony matches for Chartered Accountants, CSs, CMAs and finance professionals.";
export const PUBLIC_PATHS = ["/", "/about", "/how-it-works", "/plans", "/help", "/contact", "/success-stories", "/privacy-policy", "/terms-and-conditions", "/refund-policy"];

export function publicMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = path === "/" ? title : `${title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    robots: process.env.NEXT_PUBLIC_CLIENT_PREVIEW === "true" ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website", locale: "en_IN", siteName: SITE_NAME,
      url: path, title: fullTitle, description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CA Matrimony BNCN — A shared ambition. A life together." }],
    },
    twitter: {
      card: "summary_large_image", title: fullTitle, description,
      images: ["/opengraph-image"],
    },
  };
}

// Login remains the access boundary. These tags keep account pages out of search.
export function privateMetadata(title: string): Metadata {
  return {
    title: { absolute: `${title} | ${SITE_NAME}` },
    description: "Your private CA Matrimony BNCN account.",
    alternates: { canonical: null },
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
    openGraph: null,
    twitter: null,
  };
}
