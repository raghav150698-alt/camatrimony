"use client";
import Link from "next/link";
import { useEffect } from "react";
import { HeartHandshake } from "lucide-react";
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Page failed to render", error); }, [error]);
  return <main className="public-site min-h-screen"><div className="site-container app-empty"><HeartHandshake size={36} /><h1>Let’s try that again.</h1><p>This page couldn’t load. You can retry or return to your matches.</p><div className="flex flex-wrap justify-center gap-3"><button className="site-action" onClick={reset}>Try again</button><Link href="/dashboard" className="site-action site-action-outline">Back to matches</Link></div><Link className="site-text-link" href="/contact">Contact support</Link></div></main>;
}
