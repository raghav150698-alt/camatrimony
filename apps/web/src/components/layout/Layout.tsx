"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MemberShell from "@/components/matches/MemberShell";
import PublicShell from "./PublicShell";
import { useAuth } from '@/context/AuthContext';

const memberPaths = ["/dashboard", "/profile", "/onboarding", "/interests", "/chat", "/favorites", "/notifications", "/settings", "/support", "/my-plan", "/checkout", "/payment"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const member = (pathname !== '/checkout' || !!user) && memberPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  return member
    ? <MemberShell><div className="member-pages">{children}</div></MemberShell>
    : <PublicShell>{children}</PublicShell>;
}
