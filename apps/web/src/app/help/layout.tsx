import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/help", "Help centre", "Find answers about profile verification, personalized matches, privacy, messaging and membership on CA Matrimony BNCN.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
