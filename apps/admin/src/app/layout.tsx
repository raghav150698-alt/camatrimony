import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import AdminLayout from "@/components/AdminLayout";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://admin.camatrimonybncn.com"),
  title: "CA Matrimony BNCN — Admin Console",
  description:
    "Administrative control console for CA Matrimony BNCN. Manage users, KYC, subscriptions, payments, moderation, and more.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full font-sans antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <AdminAuthProvider>
          <AdminLayout>{children}</AdminLayout>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
