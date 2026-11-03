import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Notifications");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
