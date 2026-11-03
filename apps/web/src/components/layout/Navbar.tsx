"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, ShieldCheck, LogOut, User, ChevronRight, Bell } from "lucide-react";
import { Button } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, getInterests } from "@camatrimony/api-client";

export default function Navbar() {
  const { user, dbUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Notification and Interests counts for authenticated badges
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingInterestsCount, setPendingInterestsCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Poll for counts in the background
  useEffect(() => {
    if (!user) {
      setUnreadNotificationsCount(0);
      setPendingInterestsCount(0);
      return;
    }

    const fetchCounts = async () => {
      try {
        // Fetch notifications
        const notifRes = await getNotifications(user.uid);
        if (notifRes.success && notifRes.data) {
          const unread = notifRes.data.filter((n: any) => !n.isRead).length;
          setUnreadNotificationsCount(unread);
        }

        // Fetch received pending interests for badge
        const intRes = await getInterests(user.uid, "received");
        if (intRes.success && intRes.data) {
          const pending = intRes.data.filter((i: any) => i.status === "pending").length;
          setPendingInterestsCount(pending);
        }
      } catch (err) {
        console.warn("Navbar badges count sync failed", err);
      }
    };

    fetchCounts();
    // Poll counts every 15 seconds
    const intervalId = setInterval(fetchCounts, 15000);
    return () => clearInterval(intervalId);
  }, [user]);

  const navLinks = [
    { name: "Home", href: "/" },
    ...(user ? [
      { name: "Matches", href: "/dashboard" },
      { name: "Interests", href: "/interests", badge: pendingInterestsCount },
      { name: "Chat", href: "/chat" },
      { name: "Favorites", href: "/favorites" },
      { name: "My Plan", href: "/my-plan" },
      { name: "Profile", href: dbUser?.isOnboardingCompleted ? `/profile?id=${user.uid}` : "/onboarding" },
      { name: "Notifications", href: "/notifications", badge: unreadNotificationsCount },
      { name: "Settings", href: "/settings" },
    ] : [
      { name: "About Us", href: "/about" },
      { name: "How it Works", href: "/how-it-works" },
      { name: "Plans", href: "/plans" },
      { name: "Success Stories", href: "/success-stories" },
      { name: "Contact", href: "/contact" },
    ]),
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-md border-b border-slate-200/50 dark:border-slate-800/50 py-4"
            : "bg-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Brand Name */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gold-500 dark:border-gold-600 shadow-md transition-all duration-300 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="CA Matrimony BNCN Logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold tracking-tight text-maroon-500 dark:text-maroon-400 group-hover:text-maroon-600 transition-colors">
                  CA Matrimony
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-500">
                  BNCN
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[15px] font-medium transition-colors relative py-1 hover:text-maroon-500 flex items-center gap-1.5 ${
                    isActive(link.href)
                      ? "text-maroon-500 dark:text-gold-500 font-semibold"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-maroon-500 text-white rounded-full leading-none shrink-0">
                      {link.badge}
                    </span>
                  )}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-maroon-500 dark:bg-gold-500 rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* CTA Auth Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-4">
                  {dbUser?.isOnboardingCompleted ? (
                    <Link href="/profile/edit" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 hover:bg-emerald-100/50 transition-colors">
                      <User className="w-3.5 h-3.5" />
                      <span>{dbUser.occupation.split(",")[0] || "CA"}</span>
                    </Link>
                  ) : (
                    <Link href="/onboarding" className="animate-pulse flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200">
                      <span>Complete Onboarding</span>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <LogOut className="w-4 h-4" /> Log Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="font-medium text-slate-700 dark:text-slate-200">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                      Register Free <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer relative"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                {!isOpen && (unreadNotificationsCount > 0 || pendingInterestsCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-maroon-500 animate-ping" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          className={`lg:hidden fixed inset-y-0 right-0 z-50 w-full max-w-sm glassmorphism shadow-2xl transition-transform duration-300 ease-in-out transform ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full p-6">
            
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gold-500 dark:border-gold-600">
                  <Image
                    src="/logo.png"
                    alt="CA Matrimony BNCN Logo"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-maroon-500">
                    CA Matrimony
                  </span>
                  <span className="text-[10px] font-bold text-gold-600 -mt-1">
                    BNCN
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex-1 py-8 space-y-4 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={handleLinkClick}
                  className={`px-4 py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-between ${
                    isActive(link.href)
                      ? "bg-maroon-500 text-white shadow-md shadow-maroon-500/20"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive(link.href) ? "bg-white text-maroon-500" : "bg-maroon-500 text-white"}`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Footer with Buttons */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {user ? (
                <>
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Authenticated Session</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 break-all">
                      {dbUser?.isOnboardingCompleted ? `${dbUser.occupation.split(",")[0]} (Verified) (${dbUser.highestDegree})` : user.email || user.phoneNumber || "Verified Candidate"}
                    </span>
                    {!dbUser?.isOnboardingCompleted && (
                      <Link 
                        href="/onboarding" 
                        onClick={handleLinkClick}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 underline animate-pulse"
                      >
                        Complete Profile Onboarding <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {dbUser?.isOnboardingCompleted && (
                      <div className="flex flex-col gap-1 mt-1">
                        <Link
                          href="/profile/edit"
                          onClick={handleLinkClick}
                          className="text-xs font-bold text-maroon-500 flex items-center gap-1 underline"
                        >
                          Edit Profile <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href="/my-plan"
                          onClick={handleLinkClick}
                          className="text-xs font-bold text-slate-500 flex items-center gap-1 underline"
                        >
                          My Plan <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    fullWidth 
                    size="md" 
                    onClick={() => {
                      logout();
                      handleLinkClick();
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={handleLinkClick} className="block w-full">
                    <Button variant="outline" fullWidth size="md">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={handleLinkClick} className="block w-full">
                    <Button variant="primary" fullWidth size="md" className="flex items-center justify-center gap-2">
                      Register Free <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </>
              )}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                100% Secure & Verified Profiles
              </div>
            </div>

          </div>
        </div>

        {/* Overlay when mobile menu is open */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          />
        )}
      </nav>
    </>
  );
}
