"use client";

import { useState } from "react";
import { FileCheck2, FileText, ImagePlus, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { getAuthToken } from "@camatrimony/api-client";
import { DEFAULT_API_BASE_URL, mediaFileDisplayName, toAbsoluteMediaUrl } from "@camatrimony/shared";
import type { DBUserProfile } from "@/context/AuthContext";

type Field = "govtIdFile" | "degreeFile" | "photos";
export default function ProfileMediaEditor({ value, onChange, onUpload, uploading }: {
  value: Partial<DBUserProfile>;
  onChange: (value: Partial<DBUserProfile>) => void;
  onUpload: (field: Field) => void;
  uploading: Field | null;
}) {
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState<Field | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const photos = value.photos || [];
  const documents = [
    { field: "govtIdFile" as const, label: "Government ID", hint: "Aadhaar or passport" },
    { field: "degreeFile" as const, label: "Education certificate", hint: "ICAI, ICSI or your highest degree" },
  ];
  const preview = async (field: "govtIdFile" | "degreeFile", raw: string) => {
    setError(""); setPreviewing(field);
    try {
      const url = new URL(toAbsoluteMediaUrl(raw, apiBase), window.location.origin);
      // Never send the member token to a third-party document host.
      if (url.origin !== new URL(apiBase).origin) throw new Error("Please upload this document again to preview it securely.");
      const token = await getAuthToken();
      const response = await fetch(url.href, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(response.status === 404 ? "This file is unavailable. Please upload it again." : "Could not open this document. Please try again.");
      const blob = await response.blob();
      if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(blob.type)) throw new Error("This document cannot be previewed. Upload a PDF, JPG or PNG.");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl; link.download = mediaFileDisplayName(raw); link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open document."); }
    finally { setPreviewing(null); }
  };
  return <div className="media-editor">
    <div className="media-privacy"><ShieldCheck size={18} /><p>Documents are private. Only you and the verification team can access them.</p></div>
    <div className="media-documents">{documents.map(({ field, label, hint }) => <section key={field} className="media-document">
      <div className="media-document-icon">{value[field] ? <FileCheck2 size={23} /> : <FileText size={23} />}</div>
      <div className="min-w-0 flex-1"><h4>{label}</h4><p>{hint}</p>{value[field] && <span className="media-filename" title={mediaFileDisplayName(value[field]!)}>{mediaFileDisplayName(value[field]!)}</span>}<span className="media-file-status">{value[field] ? "File uploaded · review managed by our team" : "PDF, JPG, PNG or WEBP · up to 5 MB"}</span></div>
      <div className="media-document-actions">{value[field] ? <><button type="button" disabled={!!uploading || !!previewing} onClick={() => preview(field, value[field]!)} className="site-button-small">{previewing === field ? <Loader2 size={14} className="animate-spin" /> : "Download"}</button><button type="button" aria-label={`Remove ${label.toLowerCase()}`} disabled={!!uploading} onClick={() => onChange({ [field]: "" })} className="media-remove"><Trash2 size={16} /></button></> : <button type="button" className="site-button-small" disabled={!!uploading} onClick={() => onUpload(field)}>{uploading === field ? "Uploading…" : "Upload file"}</button>}</div>
    </section>)}</div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <section><div className="media-photos-heading"><div><h4>Your photos</h4><p>2–10 photos. Choose clear, recent images.</p></div><span>{photos.length}/10</span></div>
      <div className="media-photo-grid">{photos.map((photo, index) => <figure className="media-photo" key={`${photo}-${index}`}><img src={photo} alt={`Profile photo ${index + 1}`} /><button type="button" disabled={!!uploading} aria-label={`Remove photo ${index + 1}`} onClick={() => onChange({ photos: photos.filter((_, i) => i !== index) })}><X size={15} /></button><figcaption>{index === 0 ? "Main photo" : `Photo ${index + 1}`}</figcaption></figure>)}
        {photos.length < 10 && <button type="button" className="media-add-photo" disabled={!!uploading} onClick={() => onUpload("photos")}>{uploading === "photos" ? <Loader2 className="animate-spin" size={23} /> : <ImagePlus size={25} />}<span>{uploading === "photos" ? "Uploading…" : "Add photo"}</span></button>}
      </div>
    </section><p className="media-save-hint">Save this section to keep your changes.</p>
  </div>;
}
