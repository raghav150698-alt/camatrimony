"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clearStashedAuthNext, formatAuthError, resolvePostAuthPath, stashAuthNextFromUrl } from "@/lib/auth-errors";
import { isClientPreview, isLocalReview } from "@/lib/local-review";

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
 const { user, dbUser, authError, loading: authLoading, loginWithGoogle, loginWithPhone, confirmOTP, loginForReview } = useAuth();
 const preview=isClientPreview();
 const router=useRouter();const search=useSearchParams();const next=search.get("next");
 const [phone,setPhone]=useState("");const [otp,setOtp]=useState("");const [sent,setSent]=useState(false);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [review,setReview]=useState(false);const [cooldown,setCooldown]=useState(0);
 const container=`recaptcha-${mode}`;
 useEffect(()=>{setReview(isLocalReview());stashAuthNextFromUrl();},[next]);
 useEffect(()=>{if(!authLoading&&user){const target=resolvePostAuthPath(!!dbUser?.isOnboardingCompleted);clearStashedAuthNext();router.replace(target);}},[user,dbUser,authLoading,router]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>value-1),1000);return()=>clearTimeout(timer);},[cooldown]);
 const run=async(key:string,fn:()=>Promise<unknown>)=>{if(busy)return;setBusy(key);setError("");try{await fn();}catch(err){setError(formatAuthError(err));}finally{setBusy("");}};
 const send=()=>run("phone",async()=>{if(await loginWithPhone(phone,container)){setSent(true);setCooldown(60);}});
 const alternate=mode==="login"?"/register":"/login";
 const alternateHref=next&&next.startsWith("/")&&!next.startsWith("//")?`${alternate}?next=${encodeURIComponent(next)}`:alternate;
 return <div className="site-container auth-layout"><div className="auth-story"><p className="site-eyebrow">A SHARED FUTURE</p><h1>{mode==="login"?<>Your next chapter.<br/><em>Welcome back.</em></>:<>A little about you.<br/><em>A world of possibility.</em></>}</h1><p>{mode==="login"?"Pick up where you left off. Your matches and conversations are waiting.":"Join a community of professionals looking for a meaningful partnership."}</p><div className="home-assurance"><ShieldCheck size={17}/><span>Your pace. Your privacy. Your person.</span></div></div><div className="auth-card"><h2>{sent?"Check your phone.":mode==="login"?"Make yourself at home.":"Start your story."}</h2><p>{sent?`Enter the six-digit code sent to ${phone}.`:preview?"Use the sample account to explore the client preview.":"Sign in with Google or your mobile number. No password needed."}</p>
 {review&&!sent&&<div className="auth-review"><p>{preview?"Client preview · sample account · no OTP":"Local review · sample account · no OTP"}</p><button className="site-action w-full" disabled={!!busy||authLoading} onClick={()=>run("review",loginForReview)}>{busy==="review"?"Opening review…":"Continue as Arjun"}</button></div>}
 {!preview&&<>{!sent&&<><button className="site-action site-action-outline w-full" disabled={!!busy} onClick={()=>run("google",loginWithGoogle)}>{busy==="google"?"Connecting…":"Continue with Google"}</button><div className="auth-divider">OR USE YOUR MOBILE</div></>}
 <form onSubmit={e=>{e.preventDefault();if(sent)void run("otp",()=>confirmOTP(otp));else void send();}}>
 {sent?<label className="site-field">Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} required placeholder="6-digit code" autoFocus/></label>:<label className="site-field">Mobile number<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="+91 98765 43210"/><span className="auth-phone-hint">Include your country code.</span></label>}
 <div id={container}/>{(error||authError)&&<p className="form-error" role="alert">{error||authError}</p>}<button disabled={!!busy} type="submit" className="site-action w-full">{busy?"Please wait…":sent?"Verify & continue":"Send code"}<ArrowRight size={16}/></button>
 {sent&&<div className="auth-code-actions"><button disabled={!!busy||cooldown>0} type="button" onClick={send}>{cooldown?`Resend in ${cooldown}s`:"Resend code"}</button><button disabled={!!busy} type="button" onClick={()=>{setSent(false);setOtp("");setError("");}}>Change number</button></div>}
 </form></>}<p className="auth-fineprint">{mode==="login"?"New to the community? ":"Already have a profile? "}<Link href={alternateHref}>{mode==="login"?"Join us":"Log in"}</Link></p><p className="auth-fineprint">{preview ? "This fictional account is for design review. No registration is created." : <>By continuing, you agree to our <Link href="/terms-and-conditions">Terms</Link> and <Link href="/privacy-policy">Privacy policy</Link>.</>}</p><Link className="site-text-link" href="/forgot-password">Trouble signing in?</Link></div></div>;
}
