
import React from "react";
import Layout from "@/components/layout/Layout";


const LAST_UPDATED = "18 July 2026";

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <section className="pt-6 md:pt-8 pb-16 md:pb-24 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="static-hero"><h1>Privacy Policy</h1><p>{`Last updated: ${LAST_UPDATED}. Learn how we capture, store, protect, and handle your sensitive personal credentials.`}</p></header>

          <div className="prose dark:prose-invert max-w-none text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-300 space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p>
              Welcome to <strong>CA Matrimony BNCN</strong> ("we," "our," "us"). We are committed to protecting the privacy, security, and confidentiality of our members. This Privacy Policy details how we handle the personal information you share when registering and using our matchmaking platform located at <strong>camatrimonybncn.com</strong>.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
              <p>
                To provide a trusted, verified matchmaking experience for professionals, we collect:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Account Registration:</strong> Authentication metadata provided during Google Sign-in (Full Name, email address, profile avatar url) or mobile OTP verification.
                </li>
                <li>
                  <strong>Personal Profile Details:</strong> Detailed profile fields including Age, Height, Weight, Marital Status, Religion, Caste, Sub-caste, Gothram, Rasi, Nakshatram, and Gothram.
                </li>
                <li>
                  <strong>Professional & Career Data:</strong> Highest degree certificates, job status, salary details, current work location, and company.
                </li>
                <li>
                  <strong>Government Verification Documents:</strong> Copies of government-issued IDs (Aadhaar or Passport) to manually audit and grant verified profile trust badges.
                </li>
                <li>
                  <strong>Media Assets:</strong> Up to 10 photos and short introductory video bios uploaded by you.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. How We Use Your Information</h2>
              <p>We process your data strictly to perform our matchmaking services, including:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Auditing uploaded credentials to award profile verified badges.</li>
                <li>Displaying candidate summaries to other logged-in, authenticated members.</li>
                <li>Managing subscription enquiries, memberships and payment records.</li>
                <li>Maintaining secure in-app text chats and preventing duplicate contact deductions.</li>
                <li>Contacting you with match recommendations and email status alerts.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Information Sharing and Disclosure</h2>
              <p>
                We value your trust above all. We <strong>never sell or rent</strong> your personal or professional credentials to third-party advertising companies. Your data is shared strictly as follows:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>To Other Members:</strong> Basic bio summaries (Age, Caste, Education, Location) are displayed on the platform. Media assets are shown according to your custom photo privacy filters (Public, Matches only, or Password-protected).
                </li>
                <li>
                  <strong>Membership Support:</strong> Subscription enquiries and payment records are accessible to authorized staff handling your membership.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We will disclose your information if requested under state laws, standard judicial orders, or to protect the safety of our members.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Data Security & Storage</h2>
              <p>
                All data, profiles, and relational parameters are secured inside <strong>Cloudflare's serverless edge infrastructure</strong>. Profile photos and private Government ID proofs are uploaded directly and securely inside <strong>Cloudflare R2 Object Storage</strong> with strict access controls. Only authorized verification staff can view uploaded document proofs for audit checks.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Cookies & Tracking</h2>
              <p>
                We use secure, functional cookies to store login session states, caching dynamic Caste/Gothram dropdown configurations, and securing invisible CAPTCHA checks using Cloudflare Turnstile.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Your Rights & Profile Management</h2>
              <p>
                You maintain complete control. You can edit profile parameters, update photo visibility, or soft-delete/suspend your matrimonial profile at any time directly through your dashboard settings.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Contact Privacy Admin</h2>
              <p>
                For questions regarding data processing, security controls, or to request deletion of your account metadata, please email our security officer at{" "}
                <a href="mailto:support@camatrimonybncn.com?subject=Privacy%20Inquiry" className="text-maroon-500 dark:text-maroon-400 font-semibold hover:underline">
                  support@camatrimonybncn.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
