export type ProfileLike = {
  userId?: string;
  user_id?: string;
  fullName?: string;
  full_name?: string;
  occupation?: string;
  photos?: string[];
};

export function getProfileDisplayName(profile: ProfileLike): string {
  const name = profile.fullName ?? profile.full_name;
  if (name?.trim()) return name.trim();
  const uid = profile.userId ?? profile.user_id ?? "";
  const slug = uid.split("-").pop();
  if (slug) return slug.charAt(0).toUpperCase() + slug.slice(1);
  return profile.occupation?.split(",")[0]?.trim() || "Member";
}

export function normalizePhotoUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/success_story") || url.startsWith("/logo") || url.startsWith("/fallback")) {
    return url;
  }
  try {
    if (url.startsWith("http")) {
      const path = new URL(url).pathname;
      if (path.includes("success_story") || path.endsWith("/logo.png") || path.includes("fallback")) {
        return path.replace(/^\/v1(?=\/)/, "") || path;
      }
    }
  } catch {
    /* ignore malformed URLs */
  }
  return url;
}

export function getProfilePhotoSrc(profile: ProfileLike, isUnlocked: boolean): string {
  const photos = profile.photos?.filter(Boolean).map(normalizePhotoUrl) ?? [];
  if (photos.length > 0) return photos[0];
  return "/avatar-placeholder.svg";
}

export function getProfilePhotoList(profile: ProfileLike, isUnlocked: boolean): string[] {
  const photos = profile.photos?.filter(Boolean).map(normalizePhotoUrl) ?? [];
  if (photos.length > 0) return photos;
  return ["/avatar-placeholder.svg"];
}

/** Tailwind classes for locked profile photos (~10% blur). */
export const LOCKED_PHOTO_BLUR_CLASS = "blur-[2px] brightness-[0.98]";
