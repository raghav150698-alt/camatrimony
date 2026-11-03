import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Create your profile");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
