"use client";

import React, { useEffect, useState } from "react";
import { extractMediaKey, getAdminToken, getBaseUrl } from "@/lib/admin-api-client";

interface AdminSecureMediaProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  emptyLabel?: string;
}

export default function AdminSecureMedia({
  url,
  alt,
  className = "w-full h-full object-contain",
  emptyLabel = "Document not uploaded.",
}: AdminSecureMediaProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      setSrc(null);

      const key = extractMediaKey(url);
      if (!key) {
        setLoading(false);
        return;
      }

      try {
        const token = getAdminToken();
        const res = await fetch(
          `${getBaseUrl()}/admin/media?key=${encodeURIComponent(key)}`,
          {
            headers: token ? { "x-admin-token": token } : {},
          }
        );

        if (!res.ok) {
          throw new Error("Failed to load document");
        }

        const blob = await res.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setIsPdf(blob.type === "application/pdf" || key.toLowerCase().endsWith(".pdf"));
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!extractMediaKey(url)) {
    return (
      <div className="text-center p-4">
        <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xs font-bold text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-slate-400">
        <svg className="animate-spin h-6 w-6 text-maroon-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-bold">Loading document…</span>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="text-center p-4">
        <p className="text-xs font-bold text-rose-500">Could not load document preview.</p>
      </div>
    );
  }

  if (isPdf) {
    return <iframe src={src} title={alt} className={`${className} min-h-[280px] bg-white`} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
