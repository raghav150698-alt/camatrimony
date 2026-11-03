"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Lock, ArrowLeft, ShieldCheck, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import { Button } from "@camatrimony/ui";
import { useAuth } from "@/context/AuthContext";
import {
  createOrder,
  verifyPayment,
  getPaymentSettings,
  getPackages,
  submitManualPaymentProof,
  uploadFile,
} from "@camatrimony/api-client";
import { openCheckout } from "@camatrimony/payments";
import { DEFAULT_PACKAGES } from "@camatrimony/shared";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const packageParam = searchParams.get("package") || "1";
  const packageId = Number(packageParam) || Number(
    { gold: 1, diamond: 2, platinum: 2, "6-months": 1, "1-year": 2 }[
      packageParam.toLowerCase()
    ] || 1
  );

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(true);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [bankAccountDetails, setBankAccountDetails] = useState("");
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasManualPaymentDetails = Boolean(
    upiId.trim() || upiQrUrl.trim() || bankAccountDetails.trim()
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const qs = searchParams.toString();
      const next = `/checkout${qs ? `?${qs}` : `?package=${packageId}`}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user, authLoading, router, searchParams, packageId]);

  useEffect(() => {
    let mounted = true;
    async function loadPackage() {
      try {
        const res = await getPackages();
        const list = (res.data || []) as any[];
        const found = Array.isArray(list) ? list.find((p) => Number(p.id) === packageId) : null;
        if (found && mounted) {
          setPkg({
            ...found,
            featuresList:
              typeof found.features === "string" ? JSON.parse(found.features) : found.features || [],
          });
          return;
        }
      } catch {
        // fall through to defaults
      }
      const fallback = DEFAULT_PACKAGES.find((p) => p.id === packageId) || DEFAULT_PACKAGES[0];
      if (mounted && fallback) {
        setPkg({
          ...fallback,
          featuresList:
            typeof fallback.features === "string"
              ? JSON.parse(fallback.features)
              : fallback.features,
        });
      }
    }
    loadPackage();
    return () => {
      mounted = false;
    };
  }, [packageId]);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const res = await getPaymentSettings();
        if (mounted && res.success && res.data) {
          setRazorpayEnabled(!!res.data.razorpayEnabled);
          setRazorpayKeyId(res.data.razorpayKeyId);
          setManualPaymentEnabled(res.data.manualPaymentEnabled !== false);
          setUpiId(res.data.upiId || "");
          setUpiQrUrl(res.data.upiQrUrl || "");
          setPaymentInstructions(res.data.paymentInstructions || "");
          setBankAccountDetails(res.data.bankAccountDetails || "");
        }
      } catch (err) {
        console.error("Failed to load payment settings:", err);
      } finally {
        if (mounted) setCheckingSettings(false);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProofUpload = async (file: File) => {
    setUploadingProof(true);
    setError("");
    try {
      const res = await uploadFile(file, "payment_proof");
      if (!res.success || !res.data?.url) {
        setError(res.error || "Failed to upload payment proof.");
        return;
      }
      setProofUrl(res.data.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!user || !pkg) return;
    if (!proofUrl) {
      setError("Please upload your payment screenshot first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await submitManualPaymentProof(Number(pkg.id), proofUrl);
      if (!res.success) {
        setError(res.error || "Failed to submit payment proof.");
        setLoading(false);
        return;
      }
      setSuccessMsg(
        "Payment proof submitted. Admin will verify your details and activate your plan shortly."
      );
      setTimeout(() => router.push("/my-plan"), 2500);
    } catch (err: any) {
      setError(err?.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user || !pkg) return;
    if (!razorpayEnabled) {
      setError("Online payments are disabled. Use the manual UPI payment option below.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const orderRes = await createOrder(Number(pkg.id));
      if (!orderRes.success || !orderRes.data) {
        setError(orderRes.error || "Failed to create payment order.");
        setLoading(false);
        return;
      }

      const { orderId, amount, currency } = orderRes.data;
      const key = razorpayKeyId || null;
      if (!key) {
        setError("Payment gateway key not configured. Please contact support.");
        setLoading(false);
        return;
      }

      await openCheckout({
        key,
        orderId,
        amount,
        currency: currency || "INR",
        name: "CA Matrimony BNCN",
        description: `${pkg.name} Plan Subscription`,
        prefill: {
          name: user.displayName || undefined,
          email: user.email || undefined,
          contact: user.phoneNumber || undefined,
        },
        handler: async (response) => {
          const verifyRes = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            Number(pkg.id)
          );

          if (verifyRes.success) {
            router.push(`/payment/success?payment_id=${response.razorpay_payment_id}`);
          } else {
            router.push(
              `/payment/failure?error=${encodeURIComponent(verifyRes.error || "Payment verification failed")}&package=${encodeURIComponent(String(pkg.id))}`
            );
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });
    } catch (err: any) {
      setError(err?.message || "Payment initialization failed.");
      setLoading(false);
    }
  };

  if (authLoading || !user || !pkg || checkingSettings) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  const showManual = !razorpayEnabled || manualPaymentEnabled;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 pb-8 space-y-6">
        <Link
          href="/plans"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-maroon-500 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Link>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-xl overflow-hidden">
          <div className="bg-gradient-to-tr from-maroon-900 via-maroon-700 to-maroon-950 p-6 text-white">
            <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>
            <p className="text-sm font-light text-maroon-100 mt-1">
              {razorpayEnabled
                ? "Complete payment securely via Razorpay."
                : hasManualPaymentDetails
                  ? "Pay via UPI / bank transfer and upload proof for admin verification."
                  : "Payment details are being set up by the admin team."}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Plan
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {pkg.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-maroon-500">
                  ₹{Number(pkg.price).toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-slate-400 block">/ {pkg.validity_days} days</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Features Included
              </span>
              {pkg.featuresList?.map((f: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm font-light text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold"
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                {successMsg}
              </div>
            )}

            {razorpayEnabled && (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
                onClick={handleCheckout}
                className="flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> Pay ₹{Number(pkg.price).toLocaleString("en-IN")}{" "}
                Securely
              </Button>
            )}

            {showManual && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Manual payment (UPI / Bank)
                </h2>

                {!hasManualPaymentDetails ? (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Payment details are not configured yet
                    </p>
                    <p className="text-sm text-amber-800/90 dark:text-amber-200/90 font-light leading-relaxed">
                      An admin has not set a UPI ID, QR code, or bank account for checkout.
                      Please contact support or wait until payment instructions are published —
                      do not upload a payment screenshot until details are available.
                    </p>
                    <Link href="/contact" className="inline-block">
                      <Button variant="outline" size="sm">
                        Contact support
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {paymentInstructions && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{paymentInstructions}</p>
                    )}
                    {upiId && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase block">UPI ID</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{upiId}</span>
                      </div>
                    )}
                    {bankAccountDetails && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm whitespace-pre-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
                          Bank details
                        </span>
                        {bankAccountDetails}
                      </div>
                    )}
                    {upiQrUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={upiQrUrl}
                        alt="UPI QR code"
                        className="w-48 h-48 object-contain mx-auto rounded-xl border border-slate-200"
                      />
                    )}

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleProofUpload(f);
                      }}
                    />

                    <Button
                      variant="outline"
                      fullWidth
                      loading={uploadingProof}
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {proofUrl ? "Replace payment screenshot" : "Upload payment screenshot"}
                    </Button>

                    {proofUrl && (
                      <p className="text-xs text-emerald-600 font-semibold text-center">
                        Screenshot uploaded successfully.
                      </p>
                    )}

                    <Button
                      variant="primary"
                      fullWidth
                      size="lg"
                      loading={loading}
                      disabled={!proofUrl || !!successMsg}
                      onClick={handleManualSubmit}
                    >
                      Submit for admin verification
                    </Button>

                    <p className="text-[11px] text-slate-400 text-center">
                      After you complete your profile, admin reviews biodata + payment proof, then
                      activates your membership.
                    </p>
                  </>
                )}
              </div>
            )}

            {razorpayEnabled && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                256-bit SSL Encrypted Payment via Razorpay
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon-500 animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
