
import React from "react";
import Layout from "@/components/layout/Layout";


const LAST_UPDATED = "18 July 2026";

export default function TermsAndConditionsPage() {
  return (
    <Layout>
      <section className="pt-6 md:pt-8 pb-16 md:pb-24 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="static-hero"><h1>Terms & Conditions</h1><p>{`Last updated: ${LAST_UPDATED}. Please read these terms carefully before registering on our platform.`}</p></header>

          <div className="prose dark:prose-invert max-w-none text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-300 space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p>
              Welcome to <strong>CA Matrimony BNCN</strong> ("Platform," "Website"). These Terms and Conditions govern your access to and use of our matrimonial services. By creating an account or browsing the Platform, you agree to be bound by these Terms.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Eligibility Criteria</h2>
              <p>To register as a member of CA Matrimony BNCN, you must satisfy the following criteria:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Age Requirement:</strong> Minimum 21 years of age for males, and minimum 18 years of age for females at the time of registration.
                </li>
                <li>
                  <strong>Purpose:</strong> You must register strictly for seeking a life partner. Any usage of the Platform for dating, commercial advertisements, or scraping candidate bios is strictly prohibited.
                </li>
                <li>
                  <strong>Educational Standings:</strong> While our primary focus is Chartered Accountants (CAs), Company Secretaries (CS), Cost Accountants (CMA), CFAs, and highly educated professionals, other graduates can register subject to administrative approval.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Account Credentials & Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your secure login session. You agree to provide accurate, current, and complete details at registration. If we suspect any detail is false or fraudulent, we reserve the right to suspend or terminate your account without notice.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Mandate Verification</h2>
              <p>
                To maintain standard safety across our elite community, uploading a copy of your highest educational degree and a Government-issued ID card is required. Our staff manually verifies these details. We hold no liability for mock, fake, or forged credentials uploaded by users that slip through verification checks. Users are strongly advised to perform independent checks before finalizing marriage proposals.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Payment & Active Subscriptions</h2>
              <p>
                Premium packages (Gold, Diamond, Platinum) and Assisted Mediation add-ons are processed securely via Razorpay. All fees paid are subject to our Refund Policy. Premium features, including contact view limits, unlock histories, and priority secure chats, are bound to active validity periods.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Prohibited Member Conduct</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Create multiple accounts or fake dummy profiles.</li>
                <li>Harass, threaten, or abuse other candidates in the secure chat.</li>
                <li>Harvest contact info or profile details using automated scraping script codes.</li>
                <li>Upload obscene, offensive, or copyrighted materials/photos.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Termination of Membership</h2>
              <p>
                We reserve the right, at our sole discretion, to warn, suspend, block, or delete any profile if a member is reported for code violations, failed ID audits, or breaches of this Agreement.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Governing Jurisdiction</h2>
              <p>
                These terms are governed by and construed in accordance with the state laws of India. Any legal dispute or claims arising out of this Platform's services are subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
