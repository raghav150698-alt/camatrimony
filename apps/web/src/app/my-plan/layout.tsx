import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("My membership");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
