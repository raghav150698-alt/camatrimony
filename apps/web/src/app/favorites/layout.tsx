import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Saved profiles");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
