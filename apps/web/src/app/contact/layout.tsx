import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/contact", "Contact us", "Contact CA Matrimony BNCN for help with your profile, membership, verification or payments. Reach our support team by email or phone.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
