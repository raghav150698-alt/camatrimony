import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/privacy-policy", "Privacy policy", "Read how CA Matrimony BNCN handles personal information, profile privacy and your data rights.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
