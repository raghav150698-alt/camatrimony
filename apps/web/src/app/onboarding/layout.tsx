import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Complete your profile");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
