/** Preference fit, not a prediction of relationship success. Only explicit preferences count. */
export interface MatchProfileInput {
  age?: number;
  caste?: string;
  highest_degree?: string;
  highestDegree?: string;
  annual_income?: string;
  annualIncome?: string;
  partner_age_range?: string;
  partnerAgeRange?: string;
  partner_caste?: string;
  partnerCaste?: string;
  partner_income_min?: string;
  partnerIncomeMin?: string;
  partner_education?: string;
  partnerEducation?: string;
}

export interface MatchFactor {
  key: "age" | "caste" | "income" | "education";
  label: string;
  status: "matched" | "outside" | "unknown";
  weight: number;
}

export interface PreferenceMatch {
  score: number | null;
  factors: MatchFactor[];
  matchedCount: number;
  preferenceCount: number;
}

const clean = (value?: string) => (value || "").trim().toLowerCase();
export function isOpenPreference(value?: string): boolean {
  return !clean(value) || /^(any|all|open to all|no preference|doesn'?t matter|not specified)$/i.test(clean(value));
}

export function parseAgeRange(value?: string): [number, number] | null {
  if (isOpenPreference(value)) return null;
  const match = clean(value).match(/^(\d{2})\s*(?:-|–|—|to)\s*(\d{2})(?:\s*(?:yrs?|years?))?$/);
  if (!match) return null;
  const min = Number(match[1]), max = Number(match[2]);
  return min >= 18 && max <= 100 && min <= max ? [min, max] : null;
}

/** INR annual income in lakhs. Use the lower bound of a range; unknown is never a match. */
export function incomeInLakhs(value?: string): number | null {
  if (isOpenPreference(value)) return null;
  const text = clean(value).replace(/,/g, "");
  if (/usd|eur|gbp|\$|€|£|month|monthly|per\s*mo/.test(text)) return null;
  if (!/^(?:₹|inr|rs\.?\s*)?\s*\d/.test(text)) return null;
  const number = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(number) || number < 0) return null;
  if (/crore|\bcr\b/.test(text)) return number * 100;
  if (/lakh|lac|lpa/.test(text)) return number;
  if (/million/.test(text)) return number * 10;
  // Bare numeric amounts are annual rupees; small ambiguous amounts are not guessed.
  return number >= 10000 ? number / 100000 : null;
}

function options(value: string): string[] {
  return value.split(/[,/;|]+/).map(clean).filter(Boolean);
}

function degrees(value: string): string[] {
  return clean(value)
    .replace(/chartered accountant(?:s)?/g, "ca")
    .replace(/company secretar(?:y|ies)/g, "cs")
    .replace(/cost accountant(?:s)?/g, "cma")
    .match(/\b(?:ca|cs|cma|cfa|mba|bcom|mcom|phd)\b/g) || options(value);
}

export function scorePreferenceMatch(viewer: MatchProfileInput, candidate: MatchProfileInput): PreferenceMatch {
  const factors: MatchFactor[] = [];
  const age = parseAgeRange(viewer.partner_age_range ?? viewer.partnerAgeRange);
  if (age) factors.push({ key: "age", label: "Age", weight: 35,
    status: !candidate.age ? "unknown" : candidate.age >= age[0] && candidate.age <= age[1] ? "matched" : "outside" });

  const caste = viewer.partner_caste ?? viewer.partnerCaste;
  if (!isOpenPreference(caste)) factors.push({ key: "caste", label: "Community", weight: 25,
    status: !clean(candidate.caste) ? "unknown" : options(caste!).includes(clean(candidate.caste)) ? "matched" : "outside" });

  const minimum = incomeInLakhs(viewer.partner_income_min ?? viewer.partnerIncomeMin);
  if (minimum !== null) {
    const income = incomeInLakhs(candidate.annual_income ?? candidate.annualIncome);
    factors.push({ key: "income", label: "Income", weight: 25,
      status: income === null ? "unknown" : income >= minimum ? "matched" : "outside" });
  }

  const education = viewer.partner_education ?? viewer.partnerEducation;
  if (!isOpenPreference(education)) {
    const actual = candidate.highest_degree ?? candidate.highestDegree;
    factors.push({ key: "education", label: "Education", weight: 15,
      status: !clean(actual) ? "unknown" : degrees(education!).some(d => degrees(actual!).includes(d)) ? "matched" : "outside" });
  }

  const total = factors.reduce((sum, f) => sum + f.weight, 0);
  return {
    score: total ? Math.round(100 * factors.reduce((sum, f) => sum + (f.status === "matched" ? f.weight : 0), 0) / total) : null,
    factors,
    matchedCount: factors.filter(f => f.status === "matched").length,
    preferenceCount: factors.length,
  };
}
