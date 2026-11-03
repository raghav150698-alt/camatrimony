import Link from "next/link";
import { ArrowRight, FileCheck2, Heart, MessageCircle, SlidersHorizontal } from "lucide-react";
import Layout from "@/components/layout/Layout";
const steps = [
 { icon: FileCheck2, title: "Make it personal", body: "Sign in with Google or mobile OTP. Add your story, family details, photos and documents for review." },
 { icon: SlidersHorizontal, title: "Tell us what matters", body: "Set your partner preferences for age, community, education and income. Change them whenever you like." },
 { icon: Heart, title: "Discover a possibility", body: "Explore ranked matches, understand why they fit, and save profiles you’d like to revisit." },
 { icon: MessageCircle, title: "Start with a hello", body: "Send an interest. Accepted interests can chat; an active membership lets you unlock contacts within your plan’s limit." },
];
export default function HowItWorksPage() {
 return <Layout><div className="site-container"><header className="static-hero"><p className="site-eyebrow">HOW IT WORKS</p><h1>A few thoughtful steps.<br /><em>A meaningful beginning.</em></h1><p>From your first profile to your first conversation, take the journey at your pace.</p></header><section className="static-section"><div className="journey-grid">{steps.map(({icon:Icon,title,body},index)=><article className="static-card" key={title}><div className="journey-number">0{index+1}<Icon size={22}/></div><h2>{title}</h2><p>{body}</p></article>)}</div></section><section className="static-section"><div className="home-cta"><p className="site-eyebrow">WHEN YOU’RE READY</p><h2>Give a connection<br /><em>a place to begin.</em></h2><Link href="/register" className="site-action">Create your profile<ArrowRight size={16}/></Link><Link href="/plans" className="site-text-link">View membership</Link></div></section></div></Layout>;
}
