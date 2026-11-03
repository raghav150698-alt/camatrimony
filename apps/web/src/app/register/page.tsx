import { Suspense } from "react";
import Layout from "@/components/layout/Layout";
import AuthScreen from "@/components/registration/AuthScreen";
export default function Page() { return <Layout><Suspense fallback={<div className="profile-loading">Loading…</div>}><AuthScreen mode="register" /></Suspense></Layout>; }
