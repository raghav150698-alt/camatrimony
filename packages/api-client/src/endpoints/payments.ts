import { getApiClient } from "../client";
import type { Package, Payment, Subscription, ApiResponse } from "@camatrimony/shared";

export async function getPackages(): Promise<ApiResponse<Package[]>> {
  return getApiClient().get("/payments/packages");
}

export async function createOrder(
  packageId: number
): Promise<ApiResponse<{ orderId: string; amount: number; currency: string; keyId?: string; isMock?: boolean }>> {
  return getApiClient().post("/payments/create-order", { packageId });
}

export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  packageId: number
): Promise<ApiResponse<Payment>> {
  return getApiClient().post("/payments/verify", { orderId, paymentId, signature, packageId });
}

export async function getPayments(): Promise<ApiResponse<Payment[]>> {
  return getApiClient().get("/payments");
}

export async function getSubscription(): Promise<ApiResponse<Subscription | null>> {
  return getApiClient().get("/payments/subscription");
}

export async function cancelSubscription(): Promise<ApiResponse<any>> {
  return getApiClient().post("/payments/subscription/cancel");
}

export async function getPaymentSettings(): Promise<
  ApiResponse<{
    razorpayEnabled: boolean;
    razorpayKeyId: string | null;
    manualPaymentEnabled?: boolean;
    upiId?: string;
    upiQrUrl?: string;
    paymentInstructions?: string;
    bankAccountDetails?: string;
    astrologyMatchEnabled?: boolean;
  }>
> {
  return getApiClient().get("/payments/settings");
}

export async function submitManualPaymentProof(
  packageId: number,
  proofUrl: string,
  notes?: string
): Promise<ApiResponse<{ id: string; status: string; packageId: number }>> {
  return getApiClient().post("/payments/manual-proof", { packageId, proofUrl, notes });
}

export interface CreditEntry {id:number;subscription_id:number;amount:number;balance_after:number;reason:string;created_at:string;profileId?:string;}
export async function getCreditHistory():Promise<ApiResponse<CreditEntry[]>> {return getApiClient().get('/payments/credits');}
