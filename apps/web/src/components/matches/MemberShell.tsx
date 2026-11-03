"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Heart, LayoutGrid, LogOut, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasReviewSession, isClientPreview } from "@/lib/local-review";

const links = [
  { href: "/dashboard", label: "Discover", icon: LayoutGrid },
  { href: "/interests", label: "Interests", icon: Users },
  { href: "/chat", label: "Messages", icon: MessageCircle },
  { href: "/favorites", label: "Saved", icon: Heart },
];

export default function MemberShell({ children }: { children: React.ReactNode }) {
  const { dbUser, logout } = useAuth();
  const [review, setReview] = useState(false);
  useEffect(() => setReview(hasReviewSession() && !isClientPreview()), []);
  const pathname = usePathname();
  const router = useRouter();
  return <div className="match-workspace min-h-screen bg-[#faf8f5] text-[#292522]">
    <header className="sticky top-0 z-30 border-b border-[#e9e4de] bg-[#fffefa]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 md:h-20 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="CA Matrimony home">
              <img src="/logo.webp" width={256} height={256} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="text-[17px] font-bold tracking-tight text-[#702c36]">CA Matrimony<span className="mt-0.5 block text-[9px] font-medium tracking-[.22em] text-[#776b60]">BNCN · A SHARED FUTURE</span></span>
        </Link>
        <nav aria-label="Member navigation" className="hidden items-center gap-8 lg:flex">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
            className={`flex h-20 items-center gap-2 border-b-2 text-sm font-medium transition-colors ${pathname === href ? "border-[#702c36] text-[#702c36]" : "border-transparent text-[#7c746c] hover:text-[#702c36]"}`}><Icon size={17} strokeWidth={1.7} />{label}</Link>)}
        </nav>
        <div className="flex items-center gap-3 md:gap-5">
          <Link href="/notifications" aria-label="Notifications" className="rounded-full p-2 text-[#777067] hover:bg-[#f3eee7]"><Bell size={20} strokeWidth={1.6} /></Link>
          <details className="member-account-menu"><summary aria-label="Your account" className="flex cursor-pointer list-none items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee3d3] text-xs font-semibold text-[#70552e]">{dbUser?.fullName?.split(" ").map(n => n[0]).slice(0, 2).join("") || "ME"}</span>
            <span className="hidden text-sm font-semibold md:block">{dbUser?.fullName?.split(" ")[0] || "My profile"}</span>
          <ChevronDown size={13} className="hidden md:block" /></summary><nav aria-label="Account navigation"><Link href="/profile">View my profile</Link><Link href="/profile/edit">Edit profile</Link><Link href="/my-plan">My membership</Link><Link href="/settings">Settings & privacy</Link><Link href="/support">Help & support</Link></nav></details>
          <button aria-label="Sign out" title="Sign out" className="rounded-full p-2 text-[#776b60] hover:bg-[#f3eee7]" onClick={async () => { await logout(); router.push("/login"); }}><LogOut size={17} /></button>
        </div>
      </div>
    </header>
    {review && <div className="border-b border-[#eadfc7] bg-[#f7f0e2] px-5 py-2 text-center text-[11px] font-medium tracking-wide text-[#816b46]">LOCAL REVIEW <span className="mx-2 opacity-50">/</span> Sample profiles</div>}
    <main>{children}</main>
    <footer className="mx-auto flex max-w-[1360px] justify-between px-5 pb-24 pt-10 text-[11px] text-[#807365] lg:pb-7"><span>CA Matrimony BNCN</span><Link href="/support">Need a hand? Contact support</Link></footer>
    <nav aria-label="Mobile member navigation" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[#e9e4de] bg-[#fffefa] pb-[max(8px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-semibold ${pathname === href ? "text-[#702c36]" : "text-[#776b60]"}`}><Icon size={21} strokeWidth={1.6} />{label}</Link>)}
    </nav>
  </div>;
}
