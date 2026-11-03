import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Log in");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
