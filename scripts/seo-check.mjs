// Inspect the actual production output, not just metadata configuration.
// Run after pnpm --filter @camatrimony/web build.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const dir = new URL("../apps/web/.next/server/app/", import.meta.url);
const publicPages = ["index", "about", "how-it-works", "plans", "help", "contact", "success-stories", "privacy-policy", "terms-and-conditions", "refund-policy"];
const privatePages = ["dashboard", "profile", "profile/edit", "onboarding", "interests", "chat", "favorites", "notifications", "settings", "support", "my-plan", "checkout", "payment/success", "payment/failure", "login", "register", "forgot-password"];
const titles = new Set();
for (const page of publicPages) {
  const html = await readFile(new URL(page + ".html", dir), "utf8");
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert.ok(title && !titles.has(title), page + ": unique title");
  titles.add(title);
  const canonical = "https://camatrimonybncn.com" + (page === "index" ? "" : "/" + page);
  assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), page + ": canonical URL");
  assert.match(html, /name="description" content="[^"]+"/);
  assert.match(html, /name="robots" content="index, follow"/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, page + ": one server-rendered heading");
  assert.match(html, /property="og:url"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
}
for (const page of privatePages) {
  const html = await readFile(new URL(page + ".html", dir), "utf8");
  assert.match(html, /name="robots" content="noindex, nofollow, noarchive, nosnippet"/, page + ": noindex");
  assert.ok(!html.includes('rel="canonical"'), page + ": no inherited homepage canonical");
}
const home = await readFile(new URL("index.html", dir), "utf8");
const data = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(data["@graph"][0]["@type"], "Organization");
assert.equal(data["@graph"][1]["@type"], "WebSite");
assert.ok(home.includes("Matrimony for Chartered Accountants"));
const sitemap = await readFile(new URL("sitemap.xml.body", dir), "utf8");
assert.equal((sitemap.match(/<loc>/g) || []).length, publicPages.length);
for (const page of privatePages) assert.ok(!sitemap.includes("/" + page + "</loc>"), "private URL excluded");
const robots = await readFile(new URL("robots.txt.body", dir), "utf8");
assert.ok(robots.includes("Sitemap: https://camatrimonybncn.com/sitemap.xml"));
assert.ok(!robots.includes("Disallow: /profile"), "noindex must remain crawlable");
const image = await readFile(new URL("opengraph-image.body", dir));
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
console.log("SEO checks passed: 10 public pages, 17 private routes, structured data, sitemap, robots and 1200x630 preview.");
