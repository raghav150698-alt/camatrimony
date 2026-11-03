import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-slate-900 border-t border-slate-800 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top 4-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="flex flex-col space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gold-500 dark:border-gold-600 bg-white">
                <Image
                  src="/logo.png"
                  alt="CA Matrimony BNCN Logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-tight">
                  CA Matrimony
                </span>
                <span className="text-xs font-bold text-gold-500 uppercase tracking-widest -mt-1">
                  BNCN
                </span>
              </div>
            </Link>
            <p className="text-sm font-light leading-relaxed text-slate-400">
              India's premium professional matrimonial platform exclusively designed for Chartered Accountants, CS, CMAs, and highly educated corporate and business professionals.
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://instagram.com/camatrimonybncn"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-slate-800 hover:bg-maroon-500 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="https://facebook.com/camatrimonybncn"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-slate-800 hover:bg-maroon-500 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/camatrimonybncn"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-slate-800 hover:bg-maroon-500 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-6 border-l-2 border-gold-500 dark:border-gold-600 pl-3">
              Quick Links
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li>
                <Link href="/" className="hover:text-gold-500 transition-colors font-light">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold-500 transition-colors font-light">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-gold-500 transition-colors font-light">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/plans" className="hover:text-gold-500 transition-colors font-light">
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link href="/success-stories" className="hover:text-gold-500 transition-colors font-light">
                  Success Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-6 border-l-2 border-gold-500 dark:border-gold-600 pl-3">
              Legal
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li>
                <Link href="/privacy-policy" className="hover:text-gold-500 transition-colors font-light">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-gold-500 transition-colors font-light">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-gold-500 transition-colors font-light">
                  Refund Policy
                </Link>
              </li>
              <li className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                100% Secure SSL Site
              </li>
            </ul>
          </div>

          {/* Help & Support Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-6 border-l-2 border-gold-500 dark:border-gold-600 pl-3">
              Support & Contact
            </h3>
            <ul className="space-y-4 text-sm font-light">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <a href="tel:+916281369478" className="hover:text-gold-500 transition-colors">
                  +91 6281 369 478
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <a
                  href="mailto:support@camatrimonybncn.com"
                  className="hover:text-gold-500 transition-colors break-all"
                >
                  support@camatrimonybncn.com
                </a>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <MapPin className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <span>Hyderabad, Telangana, India.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider line */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          
          <p>© {currentYear} CA Matrimony BNCN. All Rights Reserved.</p>

          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for Indian Professionals.
          </p>

        </div>

      </div>
    </footer>
  );
}
