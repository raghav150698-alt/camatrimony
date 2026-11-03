import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Checkout");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
