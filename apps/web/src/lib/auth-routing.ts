export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://camatrimony.local");
    return url.origin === "https://camatrimony.local" ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch { return null; }
}
