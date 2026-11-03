# SEO review — 3 November 2026

Implemented locally; not deployed to production.

## Changes

- Unique titles, descriptions, canonical URLs, Open Graph and Twitter metadata for all 10 public pages.
- Public-only XML sitemap and robots.txt with sitemap discovery. No invented last-modified timestamps.
- Noindex, nofollow, noarchive and nosnippet metadata for 17 member/auth/payment routes, including nested profile editing. Removed inherited homepage canonical links from these routes.
- Member pages remain crawlable so search engines can read noindex. Authentication and API permissions remain the actual privacy boundaries.
- Organization and WebSite JSON-LD uses existing brand/contact details. No fabricated reviews, ratings, prices or public profile schema.
- Branded 1200×630 social-preview image, plus correctly sized favicon and Apple touch icon.
- Public logo reduced from 2.86 MB to 10 KB; homepage image reduced from 723 KB to 85 KB; about image reduced from 817 KB to 116 KB. Originals are preserved. Added image dimensions and lazy loading for the below-fold about image.
- Homepage introduction identifies the service and professional audience in visible text. Policy pages now have one H1 and properly ordered section headings, without changing policy substance.

## Verification

Production build and TypeScript validation passed. Run `node scripts/seo-check.mjs` after a production build to verify the actual generated HTML: unique public titles, canonical URLs, descriptions, server-rendered H1s, noindex on private routes, structured data, sitemap membership, robots directives and PNG dimensions. All checks passed.

Public pages were confirmed to contain their heading/content in server output, rather than depending on client-side JavaScript for discovery.

The live homepage was read during the audit and still contains the previous design. Live robots.txt and sitemap.xml could not be retrieved through the web tool; this is not evidence of their HTTP status. No Search Console ownership or search-performance data was available.

## After deployment

Confirm the production canonical hostname and redirects, request the deployed robots.txt/sitemap.xml, and submit the sitemap through the site's verified Google Search Console property. Use URL Inspection to check public indexability and a member route's noindex. Measure mobile Core Web Vitals with production field data; no performance score or ranking increase is claimed from this local audit.

Guidance: [Google's developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers) and [JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). Implementation uses the bundled Next.js 16.2.6 metadata, robots, sitemap and Open Graph documentation.
