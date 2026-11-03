"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, HeartHandshake, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [degree, setDegree] = useState("");
  const join = user ? "/dashboard" : "/register";
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (gender) query.set("gender", gender);
    if (age) { const [min, max] = age.split("-"); query.set("ageMin", min); query.set("ageMax", max); }
    if (degree) query.set("degree", degree);
    const target = `/dashboard${query.size ? `?${query}` : ""}`;
    router.push(user ? target : `/login?next=${encodeURIComponent(target)}`);
  };
  return <Layout>
    <section className="home-hero site-container"><div className="home-hero-copy"><p className="site-eyebrow">FOR THE LIFE YOU WANT TO SHARE</p><h1>A shared ambition.<br /><em>A life together.</em></h1><p>Matrimony for Chartered Accountants, Company Secretaries, Cost Accountants and professionals looking for a partner who understands their world.</p><div className="home-hero-actions"><Link className="site-action" href={join}>{user ? "Discover your matches" : "Find your person"}<ArrowRight size={17} /></Link><Link className="site-text-link" href="/how-it-works">How it works<ArrowUpRight size={16} /></Link></div><div className="home-assurance"><ShieldCheck size={17} /><span>Thoughtful introductions. Your privacy comes first.</span></div></div>
      <div className="home-hero-visual"><div className="home-photo-frame"><img src="/success_story_1.webp" width={960} height={960} alt="A couple sharing a moment together" fetchPriority="high" /><span className="home-image-caption">Illustrative image</span></div><div className="home-photo-note"><HeartHandshake size={25} strokeWidth={1.3} /><div><small>MORE THAN A MATCH</small><p>Someone who gets<br />your kind of life.</p></div></div><span className="home-orbit" aria-hidden="true" /></div>
    </section>
    <div className="site-container"><form className="home-search" onSubmit={search}><div className="home-search-intro"><Search size={20} /><span>A good place<br /><strong>to begin.</strong></span></div><label>Looking for<select value={gender} onChange={e => setGender(e.target.value)}><option value="">Life partner</option><option value="Female">Bride</option><option value="Male">Groom</option></select></label><label>Age range<select value={age} onChange={e => setAge(e.target.value)}><option value="">Any age</option><option value="21-25">21–25 years</option><option value="26-30">26–30 years</option><option value="31-35">31–35 years</option><option value="36-40">36–40 years</option><option value="41-70">41+ years</option></select></label><label>Qualification<select value={degree} onChange={e => setDegree(e.target.value)}><option value="">Any qualification</option><option value="CA">Chartered Accountant</option><option value="CS">Company Secretary</option><option value="CMA">Cost Accountant</option><option value="MBA">MBA</option><option value="CFA">CFA</option></select></label><button className="site-action" type="submit">Explore matches<ArrowRight size={16} /></button></form></div>
    <section className="home-community site-container"><p>A SPACE FOR PEOPLE WHO UNDERSTAND YOUR WORLD</p><div><span>Chartered Accountants</span><i /><span>Company Secretaries</span><i /><span>Cost Accountants</span><i /><span>Finance professionals</span></div></section>
    <section className="home-values"><div className="site-container"><div className="site-section-heading"><div><p className="site-eyebrow">CONNECTION, WITH INTENTION</p><h2>A little more in common.<br /><em>A lot more to discover.</em></h2></div><p>Your work is part of who you are.<br />Find someone who sees the rest, too.</p></div><div className="home-value-grid">{[
      { icon: ShieldCheck, title: "Trust takes care", description: "Identity and education documents support our profile review process." },
      { icon: Sparkles, title: "What matters to you", description: "Age, community, education and income preferences shape your recommendations." },
      { icon: LockKeyhole, title: "Room to feel ready", description: "Keep contact details private. Choose when you want to connect." },
    ].map(({ icon: Icon, title, description }) => <article key={title}><Icon size={25} strokeWidth={1.4} /><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="home-steps site-container"><div><p className="site-eyebrow">A SIMPLE BEGINNING</p><h2>From a hello<br /><em>to a possibility.</em></h2><Link className="site-text-link" href="/how-it-works">See the journey<ArrowUpRight size={15} /></Link></div><div className="home-step-list">{[["01", "Tell your story", "Build a profile that reflects your life, your family and what you’re looking for."], ["02", "Meet your possibilities", "Discover profiles ranked around your preferences. Save the ones you’d like to revisit."], ["03", "Take the next step", "Send an interest. When it’s mutual, start a conversation."]].map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={19} /></article>)}</div></section>
    <section className="home-cta site-container"><p className="site-eyebrow">YOUR NEXT CHAPTER</p><h2>Some things are<br /><em>better shared.</em></h2><p>Start with a profile. See where it takes you.</p><Link className="site-action" href={join}>{user ? "Go to your matches" : "Create your profile"}<ArrowRight size={17} /></Link><Link className="site-text-link" href="/plans">Explore membership</Link></section>
  </Layout>;
}
