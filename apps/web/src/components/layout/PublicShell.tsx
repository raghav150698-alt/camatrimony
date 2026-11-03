"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navigation = [
  ["Our story", "/about"], ["How it works", "/how-it-works"], ["Membership", "/plans"], ["Contact", "/contact"],
];

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  return <div className="public-site">
    <a href="#page-content" className="skip-link">Skip to content</a>
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link href="/" className="site-brand" aria-label="CA Matrimony home"><img src="/logo.webp" width={256} height={256} alt="" /><span>CA Matrimony<small>BNCN · A SHARED FUTURE</small></span></Link>
        <nav aria-label="Main navigation" className="site-desktop-nav">{navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
        <div className="site-header-actions"><Link href={user ? "/dashboard" : "/login"} className="site-login">{user ? "My matches" : "Log in"}</Link><Link href={user ? "/dashboard" : "/register"} className="site-action site-desktop-cta">{user ? "Discover" : "Join the community"}<ArrowRight size={15} /></Link><button className="site-menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
      {open && <nav id="public-navigation" aria-label="Mobile navigation" className="site-mobile-nav">{navigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link className="site-action" href={user ? "/dashboard" : "/register"} onClick={() => setOpen(false)}>{user ? "My matches" : "Create your profile"}<ArrowRight size={15} /></Link></nav>}
    </header>
    <main id="page-content" className="site-content">{children}</main>
    <footer className="site-footer"><div className="site-container">
      <div className="site-footer-grid"><div><Link href="/" className="site-brand"><img src="/logo.webp" width={256} height={256} alt="" /><span>CA Matrimony<small>BNCN · A SHARED FUTURE</small></span></Link><p>A meeting of shared ambitions.<br />A beginning of something personal.</p></div>
        <div><h2>Explore</h2><Link href="/about">Our story</Link><Link href="/how-it-works">How it works</Link><Link href="/plans">Membership</Link><Link href="/success-stories">Community stories</Link></div>
        <div><h2>Here to help</h2><Link href="/help">Help centre</Link><Link href="/contact">Get in touch</Link><a href="mailto:support@camatrimonybncn.com">Email support</a><a href="tel:+916281369478">+91 6281 369 478</a></div>
        <div><h2>The details</h2><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-and-conditions">Terms & conditions</Link><Link href="/refund-policy">Refund policy</Link></div>
      </div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} CA Matrimony BNCN</span><span>Made for meaningful beginnings.</span></div>
    </div></footer>
  </div>;
}
