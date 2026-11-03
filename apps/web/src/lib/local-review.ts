export const REVIEW_USER_ID = "mock-user-review";
export const REVIEW_SESSION_KEY = "camatrimony_local_review";

export function isClientPreview(): boolean {
  return process.env.NEXT_PUBLIC_CLIENT_PREVIEW === "true"
    && process.env.NEXT_PUBLIC_API_BASE_URL === "/api/review";
}

export function isLocalReview(): boolean {
  return isClientPreview() || (process.env.NODE_ENV === "development"
    && process.env.NEXT_PUBLIC_LOCAL_REVIEW === "true"
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
}

export function hasReviewSession(): boolean {
  return isLocalReview() && localStorage.getItem(REVIEW_SESSION_KEY) === REVIEW_USER_ID;
}
