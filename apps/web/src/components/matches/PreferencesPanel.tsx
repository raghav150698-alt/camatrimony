"use client";

import { useState } from "react";
import { Check, ChevronRight, Filter, Pencil, SlidersHorizontal } from "lucide-react";
import { incomeInLakhs, parseAgeRange } from "@camatrimony/shared";
import { useAuth } from "@/context/AuthContext";

export default function PreferencesPanel({ filtersOpen, onToggleFilters }: { filtersOpen: boolean; onToggleFilters: () => void }) {
  const { dbUser, updateProfileData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [caste, setCaste] = useState("");
  const [income, setIncome] = useState("");
  const [education, setEducation] = useState("");
  const rows = [
    ["Age", dbUser?.partnerAgeRange || "Any age"],
    ["Community", dbUser?.partnerCaste || "Open to all"],
    ["Annual income", dbUser?.partnerIncomeMin || "Any income"],
    ["Education", dbUser?.partnerEducation || "Any qualification"],
  ];
  const startEdit = () => {
    const range = parseAgeRange(dbUser?.partnerAgeRange);
    setMin(range ? String(range[0]) : ""); setMax(range ? String(range[1]) : "");
    setCaste(dbUser?.partnerCaste || ""); setIncome(dbUser?.partnerIncomeMin || "");
    setEducation(dbUser?.partnerEducation || ""); setError(""); setSaved(false); setEditing(true);
  };
  return <section className="rounded-2xl border border-[#e8e1d8] bg-[#fffefa] p-5">
    <div className="mb-2 flex items-center justify-between gap-2 lg:mb-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={16} className="text-[#966c48]" />Your preferences</h2>
      <div className="flex items-center gap-1">{!editing && <button onClick={startEdit} aria-label="Edit preferences" className="rounded-lg p-2 text-[#702c36] hover:bg-[#f7eeeb]"><Pencil size={14} /></button>}<button type="button" aria-label="Search filters" aria-expanded={filtersOpen} aria-controls="match-filters" onClick={onToggleFilters} className="rounded-lg p-2 text-[#776b60] hover:bg-[#f7eeeb] lg:hidden"><Filter size={15} /></button></div>
    </div>
    {editing ? <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setError("");
      const range = min || max ? `${min} - ${max}` : "";
      if (min && max && Number(min) > Number(max)) { setError("Minimum age must not exceed maximum age."); return; }
      if (range && !parseAgeRange(range)) { setError("Choose an age range from 18 to 100."); return; }
      if (income && incomeInLakhs(income) === null) { setError("Use annual INR income, e.g. ₹15 LPA."); return; }
      setSaving(true);
      try {
        await updateProfileData({ partnerAgeRange: range, partnerCaste: caste.trim(), partnerIncomeMin: income.trim(), partnerEducation: education.trim() });
        setEditing(false); setSaved(true);
      } catch (err) { setError(err instanceof Error ? err.message : "Could not save preferences."); }
      finally { setSaving(false); }
    }}>
      <fieldset><legend className="match-label">Age range</legend><div className="flex items-center gap-2">
        <input className="match-input min-w-0" aria-label="Minimum preferred age" type="number" min="18" max="100" placeholder="18" value={min} onChange={e => setMin(e.target.value)} />
        <span className="text-[#aca095]">–</span><input className="match-input min-w-0" aria-label="Maximum preferred age" type="number" min="18" max="100" placeholder="100" value={max} onChange={e => setMax(e.target.value)} />
      </div></fieldset>
      <label className="match-label">Community<input className="match-input mt-1.5" value={caste} onChange={e => setCaste(e.target.value)} placeholder="Open to all" /><span className="mt-1 block text-[10px] font-normal text-[#776b60]">Separate communities with a comma.</span></label>
      <label className="match-label">Minimum annual income<input className="match-input mt-1.5" value={income} onChange={e => setIncome(e.target.value)} placeholder="e.g. ₹15 LPA" /></label>
      <label className="match-label">Education<input className="match-input mt-1.5" value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. CA / CS / MBA" /></label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex items-center gap-2"><button disabled={saving} className="match-primary flex-1" type="submit">{saving ? "Saving…" : "Save preferences"}</button><button disabled={saving} className="rounded-lg px-3 py-2 text-xs text-[#766b61]" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
    </form> : <><p className="text-[11px] leading-relaxed text-[#776b60] lg:hidden">{rows.slice(0, 3).map(([, value]) => value).join(" · ")}</p><dl className="hidden space-y-4 lg:block">{rows.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wider text-[#807365]">{label}</dt><dd className="mt-1 text-[13px] font-medium text-[#4e453e]">{value}</dd></div>)}</dl>
      <button className="mt-5 hidden w-full items-center justify-between border-t border-[#ece6de] pt-4 text-xs font-semibold text-[#702c36] lg:flex" onClick={startEdit}>Refine my matches<ChevronRight size={14} /></button></>}
    {saved && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-[#52705e]"><Check size={13} />Preferences saved</p>}
  </section>;
}
