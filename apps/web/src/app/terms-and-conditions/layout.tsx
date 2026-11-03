import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/terms-and-conditions", "Terms and conditions", "Read the terms for using CA Matrimony BNCN, including membership, eligibility and account responsibilities.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
