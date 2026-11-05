"use client";

import { useEffect, useState } from "react";
import { Input, Select } from "@camatrimony/ui";
import { HIGHEST_DEGREE_OPTIONS } from "@camatrimony/shared";

const isCustom = (value: string) => !!value && !HIGHEST_DEGREE_OPTIONS.some(option => option.value === value && option.value !== "Other");

export default function DegreeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [other, setOther] = useState(() => isCustom(value));
  useEffect(() => { if (isCustom(value)) setOther(true); }, [value]);
  return <div className="space-y-4">
    <Select id="highestDegree" name="highestDegree" label="Highest qualification" labelStyle="wizard"
      fieldSize="compact" required value={other ? "Other" : value} options={HIGHEST_DEGREE_OPTIONS}
      onChange={event => { setOther(event.target.value === "Other"); onChange(event.target.value); }}
      placeholder="Select your qualification" />
    {other && <Input id="customDegree" name="customDegree" label="Your qualification" required
      value={value === "Other" ? "" : value} maxLength={120} minLength={2}
      onChange={event => onChange(event.target.value || "Other")} placeholder="e.g. Master of Public Health" />}
  </div>;
}
