"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { getPackages } from "@camatrimony/api-client";
import { SUBSCRIPTION_EMAIL } from "@/lib/membership";

function SubscriptionContent() {
  const params = useSearchParams();
  const selection = params.get("package") || "1";
  const aliases: Record<string, number> = { gold: 1, diamond: 2, platinum: 3, "6-months": 1, "1-year": 2 };
  const id = Number(selection) || aliases[selection.toLowerCase()];
  const [pkg, setPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getPackages().then(result => {
      if (!result.success) throw new Error("Could not load this membership. Please try again.");
      const plan = (result.data || []).find((item: any) => Number(item.id) === id && item.is_active !== 0);
      if (!plan) throw new Error("This membership is unavailable. Please choose another plan.");
      const raw = typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features;
      if (active) setPackage({ ...plan, features: Array.isArray(raw) ? raw.filter((item: unknown) => typeof item === "string") : [] });
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not load this membership."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const subject = encodeURIComponent(`Subscription enquiry${pkg ? ` — ${pkg.name}` : ""}`);
  return <Layout><div className="site-container max-w-3xl py-8 md:py-12">
    <Link href="/plans" className="inline-flex items-center gap-2 text-sm text-[#776b60]"><ArrowLeft size={16}/>Back to memberships</Link>
    <header className="static-hero"><p className="site-eyebrow">SUBSCRIPTION</p><h1>Your next<br/><em>step together.</em></h1></header>
    {loading ? <div role="status" className="profile-loading"><Loader2 className="animate-spin"/>Loading membership…</div> : error ? <section role="alert" className="rounded-3xl border border-[#e9e4de] bg-[#fffefa] p-7"><p>{error}</p><Link href="/plans" className="site-action mt-5">View memberships</Link></section> : <section className="rounded-3xl border border-[#e9e4de] bg-[#fffefa] p-6 md:p-8">
      <div className="flex flex-wrap justify-between gap-4 border-b border-[#e9e4de] pb-6"><div><p className="site-eyebrow">YOUR MEMBERSHIP</p><h2 className="mt-2 text-2xl font-semibold">{pkg.name}</h2></div><div><p className="text-3xl font-semibold">₹{Number(pkg.price).toLocaleString("en-IN")}</p><p className="mt-2 text-sm text-[#776b60]">{pkg.validity_days} days · {pkg.contact_limit} contact credits</p></div></div>
      <ul className="space-y-3 py-6">{pkg.features.map((feature: string, index: number) => <li key={index} className="flex items-start gap-3 text-sm"><CheckCircle size={17} className="shrink-0 mt-0.5 text-[#8a3342]"/>{feature}</li>)}</ul>
      <div className="rounded-2xl bg-[#f5efe8] p-5 md:p-6"><h3 className="text-lg font-semibold">Contact us for your subscription</h3><p className="mt-2 text-sm text-[#776b60]">For subscriptions, email <a className="underline break-all" href={`mailto:${SUBSCRIPTION_EMAIL}`}>{SUBSCRIPTION_EMAIL}</a>.</p><a href={`mailto:${SUBSCRIPTION_EMAIL}?subject=${subject}`} className="site-action mt-5"><Mail size={17}/>Email for subscription</a></div>
    </section>}
  </div></Layout>;
}

export default function CheckoutPage() {
  return <Suspense fallback={<div role="status" className="profile-loading"><Loader2 className="animate-spin"/>Loading membership…</div>}><SubscriptionContent/></Suspense>;
}
