import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Your matches");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
