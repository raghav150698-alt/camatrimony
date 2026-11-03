import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/success-stories", "Community stories", "Explore featured community stories shared through CA Matrimony BNCN.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
