import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { HOME_DESCRIPTION, HOME_TITLE, publicMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./design.css";

const plusJakartaSans = localFont({ src: "./fonts/plus-jakarta-sans.woff2", variable: "--font-plus-jakarta", weight: "400 800", display: "swap" });
const inter = localFont({ src: "./fonts/inter.woff2", variable: "--font-inter", weight: "400 700", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...publicMetadata("/", HOME_TITLE, HOME_DESCRIPTION),
  applicationName: SITE_NAME,
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.webp`,
      email: "support@camatrimonybncn.com", telephone: "+91-6281-369-478",
    },
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`,
      name: SITE_NAME, url: SITE_URL, inLanguage: "en-IN",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${plusJakartaSans.variable} ${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
