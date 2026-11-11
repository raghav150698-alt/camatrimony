import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
const questions = [
 ["How do I create a profile?", "Use Google or a mobile OTP to sign in, then complete your profile, photos and verification documents."],
 ["How are profiles verified?", "The team reviews submitted government ID and education documents. A verified badge appears after approval; uploading a file alone does not mean it is verified."],
 ["How are matches ranked?", "Recommendations compare profiles against your saved age, community, education and minimum annual income preferences. Open preferences do not reduce a score. Expand ‘Why this match’ to see the factors."],
 ["When can I message someone?", "Messaging becomes available after an accepted interest or a qualifying contact unlock. Blocking prevents further messaging."],
 ["What does membership include?", "Plans offer a stated number of contact unlocks over a stated duration. See the membership page for current options. For subscriptions, email admin@camatrimonybncn.com."],
 ["How do I change my preferences?", "Edit Your preferences on the Discover page, or open Partner preferences in your profile editor. Save your changes to update recommendations."],
 ["I can’t sign in. What should I do?", "Use the same Google account or mobile number you registered with. No password is required. If an OTP expires, request a new one. Contact support if you’re still unable to sign in."],
 ["How do I report or block someone?", "Open their profile and choose Report profile or Block profile. You can manage blocked profiles in Settings."],
 ["Can I cancel my membership?", "Manage your membership from My plan. Review the refund policy or contact support for help with a payment."],
];
export default function HelpPage(){return <Layout><div className="site-container"><header className="static-hero"><p className="site-eyebrow">HELP CENTRE</p><h1>A little clarity.<br /><em>A little reassurance.</em></h1><p>Answers to questions about profiles, privacy and making a connection.</p></header><section className="static-section max-w-3xl"><div className="site-faq">{questions.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><div className="help-contact"><h2>Still need a hand?</h2><p>Our team can help with your account, membership or profile.</p><Link className="site-action" href="/contact">Talk to us<ArrowRight size={16}/></Link></div></section></div></Layout>;}
