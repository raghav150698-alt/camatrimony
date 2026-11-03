import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata("/about", "Our story", "Meet CA Matrimony BNCN, a matrimony community for Chartered Accountants, Company Secretaries, Cost Accountants and other professionals.");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
