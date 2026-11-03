import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Support");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
