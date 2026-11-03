import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Conversations");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
