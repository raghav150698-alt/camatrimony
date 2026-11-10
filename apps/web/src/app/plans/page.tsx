"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { getPackages, getPaymentSettings } from "@camatrimony/api-client";
import { DEFAULT_PACKAGES } from "@camatrimony/shared";

interface PlanCard {
  id: number;
  name: string;
  basePrice: number;
  validity: string;
  contactViews: number | string;
  features: string[];
  popular: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [manualDetailsReady, setManualDetailsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pkgRes, settingsRes] = await Promise.all([
          getPackages(),
          getPaymentSettings().catch(() => null),
        ]);
        if (settingsRes?.success && settingsRes.data) {
          setRazorpayEnabled(!!settingsRes.data.razorpayEnabled);
          const d = settingsRes.data;
          setManualDetailsReady(
            Boolean(
              (d.upiId || "").trim() ||
                (d.upiQrUrl || "").trim() ||
                (d.bankAccountDetails || "").trim()
            )
          );
        }
        const list = (pkgRes.data || []) as any[];
        const source = Array.isArray(list) && list.length > 0 ? list : DEFAULT_PACKAGES;
        if (mounted) {
          setPlans(
            source
              .filter((p: any) => p.is_active !== 0)
              .map((p: any, idx: number) => {
                const features =
                  typeof p.features === "string"
                    ? JSON.parse(p.features)
                    : Array.isArray(p.features)
                      ? p.features
                      : [];
                return {
                  id: Number(p.id),
                  name: p.name,
                  basePrice: Number(p.price),
                  validity: `${p.validity_days} days`,
                  contactViews: p.contact_limit >= 9999 ? "Unlimited" : p.contact_limit,
                  features,
                  popular: idx === 1 || Number(p.price) === 1800,
                };
              })
          );
        }
      } catch {
        if (mounted) {
          setPlans(
            DEFAULT_PACKAGES.map((p, idx) => ({
              id: p.id,
              name: p.name,
              basePrice: p.price,
              validity: `${p.validity_days} days`,
              contactViews: p.contact_limit,
              features: JSON.parse(p.features as string),
              popular: idx === 1,
            }))
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return <Layout><div className="site-container"><header className="static-hero"><p className="site-eyebrow">MEMBERSHIP</p><h1>A little more possibility.<br /><em>At your own pace.</em></h1><p>Choose the time and contact access that works for you. Your profile is a beginning; membership helps you take the next step.</p></header><section className="static-section">
    {loading ? <div className="profile-loading" role="status"><Loader2 className="animate-spin" size={25}/>Loading memberships…</div> : <div className="pricing-grid">{plans.map(plan=><article className={`pricing-card ${plan.popular?"is-popular":""}`} key={plan.id}>{plan.popular&&<span className="pricing-badge">More time to connect</span>}<h2>{plan.name}</h2><p className="pricing-amount">₹{plan.basePrice.toLocaleString("en-IN")}<small>{plan.validity} · {plan.contactViews} contact views</small></p><ul>{plan.features.map((feature,index)=><li key={index}><CheckCircle size={15}/>{feature}</li>)}</ul><Link href={`/checkout?package=${plan.id}`} className={`site-action ${plan.popular?"":"site-action-outline"}`}>Choose membership</Link></article>)}</div>}

    </section><section className="static-section max-w-3xl mx-auto"><div className="site-section-heading"><div><p className="site-eyebrow">THE DETAILS</p><h2>Good to know.</h2></div></div><div className="site-faq">{[
      ["What is a contact view?","Unlocking a member’s contact details uses one contact credit. Viewing the same unlocked contact again does not use another credit."],
      ["When can I start chatting?","Chat is available after an accepted interest or a qualifying contact unlock. Each member chooses who they want to connect with."],
      ["When do credits expire?","Unused contact credits expire when your membership ends. Previously unlocked contacts do not cost another credit to view."],
      ["Need help choosing?","Contact our team with questions about your profile, membership or payment. Refund eligibility is described in the refund policy."],
    ].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section></div></Layout>;
}
