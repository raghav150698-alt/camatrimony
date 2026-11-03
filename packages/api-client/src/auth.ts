/**
 * Helper to get the Firebase auth token for attaching to API requests.
 * Works in browser environments where Firebase Auth is available.
 */

export type AuthTokenGetterOptions = { forceRefresh?: boolean };

let firebaseAuthGetter: ((opts?: AuthTokenGetterOptions) => Promise<string | null>) | null = null;

/**
 * Register a function that returns the current Firebase auth token.
 * This allows the api-client to be decoupled from the Firebase SDK.
 *
 * @example
 * import { getAuth } from "firebase/auth";
 * setAuthTokenGetter(async (opts) => {
 *   const user = getAuth().currentUser;
 *   return user ? await user.getIdToken(opts?.forceRefresh === true) : null;
 * });
 */
export function setAuthTokenGetter(
  getter: (opts?: AuthTokenGetterOptions) => Promise<string | null>
): void {
  firebaseAuthGetter = getter;
}

/**
 * Gets the current Firebase auth token, if available.
 * Pass `{ forceRefresh: true }` before sensitive uploads so an expired
 * cached JWT is refreshed instead of silently failing auth.
 * Returns null if no token is available (e.g., not logged in, or in mock mode).
 */
export async function getAuthToken(
  opts?: AuthTokenGetterOptions
): Promise<string | null> {
  if (!firebaseAuthGetter) {
    return null;
  }

  try {
    const token = await firebaseAuthGetter(opts);
    if (token) return token;
    // forceRefresh can fail transiently — fall back to cached JWT for uploads/API calls
    if (opts?.forceRefresh) {
      return await firebaseAuthGetter(undefined);
    }
    return null;
  } catch {
    if (opts?.forceRefresh) {
      try {
        return await firebaseAuthGetter(undefined);
      } catch {
        return null;
      }
    }
    return null;
  }
}
