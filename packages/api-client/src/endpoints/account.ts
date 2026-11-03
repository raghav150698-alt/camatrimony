import { getApiClient } from "../client";
import type { ApiResponse } from "@camatrimony/shared";

/**
 * Permanently deletes the authenticated user's account.
 * Cascades across all user-owned D1 tables and deletes R2 files (photos, govt ID, degree).
 * The Firebase auth user record may remain (requires Firebase Admin SDK to delete,
 * which is not available in Workers edge runtime), but all PII is removed from D1 and R2.
 * The caller must call logout() after this succeeds.
 */
export async function deleteUserAccount(): Promise<ApiResponse<{ message: string }>> {
  return getApiClient().delete("/user/account");
}
