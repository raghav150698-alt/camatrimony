
import React from "react";
import Layout from "@/components/layout/Layout";


const LAST_UPDATED = "18 July 2026";

export default function RefundPolicyPage() {
  return (
    <Layout>
      <section className="pt-6 md:pt-8 pb-16 md:pb-24 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="static-hero"><h1>Refund Policy</h1><p>{`Last updated: ${LAST_UPDATED}. Please read our payment refund terms and refund criteria.`}</p></header>

          <div className="prose dark:prose-invert max-w-none text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-300 space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p>
              At <strong>CA Matrimony BNCN</strong>, we strive to deliver a premium, high-value matrimonial search environment. We encourage you to carefully review our packages, contact view caps, and mediation add-on inclusions before purchasing premium plans.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Standard Non-Refundability</h2>
              <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-300">
                As a standard operational policy, all purchases made on <strong>camatrimonybncn.com</strong> for digital premium membership plans (Gold, Diamond, Platinum) and Assisted Mediation add-ons are <strong>100% non-refundable</strong>.
              </div>
              <p>
                Once an upgrade order is executed and the package is activated in your account, the matchmaking service is deemed to have been rendered immediately.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Exceptional Cases for Review</h2>
              <p>
                We do understand unique technical difficulties. You can write to our billing department for payment evaluation strictly under these exceptional scenarios:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Duplicate Deductions:</strong> If your bank account got debited twice for a single order due to transaction lag or gateway timeouts, the extra duplicate capture will be refunded in full within 5-7 working days.
                </li>
                <li>
                  <strong>System Malfunctions:</strong> If a technical bug prevents account activation for more than 48 hours after payment capture, and our developers fail to manually activate it, you can request a cancellation and refund.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Non-refundable Conditions</h2>
              <p>Refund requests will NOT be reviewed if:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You change your mind after buying a plan.</li>
                <li>You find a suitable match outside the platform during your active subscription period.</li>
                <li>Your profile is suspended or deleted by the admin team due to code of conduct violations or failed verification checks.</li>
                <li>You do not get active responses or matches from other users (as matching rests on mutual consent).</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Refund Processing Timeline</h2>
              <p>
                If your refund request is approved by our billing committee, the refund will be processed back to the original payment source (UPI, Credit/Debit Card, or NetBanking) via Razorpay. It typically takes <strong>5 to 7 working days</strong> for the refunded sum to reflect in your bank statement.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Write to Billing Support</h2>
              <p>
                To file a dispute or request double payment returns, email our support crew at{" "}
                <a href="mailto:support@camatrimonybncn.com?subject=Refund%20Request" className="text-maroon-500 dark:text-maroon-400 font-semibold hover:underline">
                  support@camatrimonybncn.com
                </a>{" "}
                with your registered Mobile Number, Registered Email, Razorpay Order ID, Payment ID, and payment receipt screenshots.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
