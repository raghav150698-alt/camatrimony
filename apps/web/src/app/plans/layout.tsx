import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/plans", "Membership plans", "Explore CA Matrimony BNCN membership options, contact unlocks and plan durations. Choose the membership that suits your search.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
