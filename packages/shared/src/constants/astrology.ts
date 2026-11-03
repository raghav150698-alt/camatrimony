/**
 * Curated India Hindu astrology lists + a simple, explainable compatibility scorer.
 * This is NOT a Vedic-certified Ashtakoota engine — labeled honestly in the UI.
 */

export const RASI_OPTIONS = [
  "Mesha (Aries)",
  "Vrishabha (Taurus)",
  "Mithuna (Gemini)",
  "Karka (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrischika (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makara (Capricorn)",
  "Kumbha (Aquarius)",
  "Meena (Pisces)",
] as const;

export const NAKSHATRA_OPTIONS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const KUJA_DOSHAM_OPTIONS = ["No", "Yes", "Don't Know"] as const;

/** Friendly groups for a transparent rasi affinity heuristic (not classical Ashtakoota). */
const RASI_ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  mesha: "fire",
  aries: "fire",
  vrishabha: "earth",
  taurus: "earth",
  mithuna: "air",
  gemini: "air",
  karka: "water",
  cancer: "water",
  simha: "fire",
  leo: "fire",
  kanya: "earth",
  virgo: "earth",
  tula: "air",
  libra: "air",
  vrischika: "water",
  scorpio: "water",
  dhanu: "fire",
  sagittarius: "fire",
  makara: "earth",
  capricorn: "earth",
  kumbha: "air",
  aquarius: "air",
  meena: "water",
  pisces: "water",
};

function normalizeKey(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, " ")
    .trim()
    .split(/\s+/)[0] || "";
}

function rasiElement(rasi?: string | null): string | null {
  const key = normalizeKey(rasi);
  return RASI_ELEMENT[key] || null;
}

function nakshatraIndex(nak?: string | null): number {
  const key = (nak || "").toLowerCase().replace(/[^a-z]/g, "");
  return NAKSHATRA_OPTIONS.findIndex((n) => n.toLowerCase().replace(/[^a-z]/g, "") === key);
}

function isManglik(value?: string | null): boolean {
  const v = (value || "").toLowerCase().trim();
  return v === "yes" || v === "y" || v === "true" || v === "1";
}

export interface AstrologyProfileInput {
  rasi?: string | null;
  nakshatram?: string | null;
  kujaDosham?: string | null;
}

export interface AstrologyMatchResult {
  /** 0–100 percentage for UI */
  percent: number;
  /** Transparent breakdown for display */
  factors: Array<{ name: string; points: number; max: number; note: string }>;
  label: string;
  disclaimer: string;
}

/**
 * Simple explainable scorer:
 * - Rasi element affinity (same/complementary)
 * - Nakshatra distance heuristic
 * - Manglik / Chevvai flag alignment
 * Max raw points = 40 → mapped to percent.
 */
export function computeSimpleAstrologyMatch(
  a: AstrologyProfileInput,
  b: AstrologyProfileInput
): AstrologyMatchResult {
  const factors: AstrologyMatchResult["factors"] = [];
  let points = 0;

  const elA = rasiElement(a.rasi);
  const elB = rasiElement(b.rasi);
  if (elA && elB) {
    let rasiPts = 4;
    let note = "Different elemental temperament";
    if (elA === elB) {
      rasiPts = 12;
      note = "Same elemental group";
    } else if (
      (elA === "fire" && elB === "air") ||
      (elA === "air" && elB === "fire") ||
      (elA === "earth" && elB === "water") ||
      (elA === "water" && elB === "earth")
    ) {
      rasiPts = 10;
      note = "Complementary elements";
    }
    points += rasiPts;
    factors.push({ name: "Rasi affinity", points: rasiPts, max: 12, note });
  } else {
    factors.push({ name: "Rasi affinity", points: 0, max: 12, note: "Missing rasi data" });
  }

  const idxA = nakshatraIndex(a.nakshatram);
  const idxB = nakshatraIndex(b.nakshatram);
  if (idxA >= 0 && idxB >= 0) {
    const dist = Math.min(Math.abs(idxA - idxB), 27 - Math.abs(idxA - idxB));
    let nakPts = 4;
    let note = "Distant nakshatras";
    if (dist === 0) {
      nakPts = 14;
      note = "Same nakshatra";
    } else if (dist <= 3) {
      nakPts = 12;
      note = "Nearby nakshatras";
    } else if (dist <= 7) {
      nakPts = 9;
      note = "Moderate nakshatra distance";
    }
    points += nakPts;
    factors.push({ name: "Nakshatra proximity", points: nakPts, max: 14, note });
  } else {
    factors.push({ name: "Nakshatra proximity", points: 0, max: 14, note: "Missing nakshatra data" });
  }

  const mangA = isManglik(a.kujaDosham);
  const mangB = isManglik(b.kujaDosham);
  const bothKnown =
    !!(a.kujaDosham && a.kujaDosham !== "Don't Know") &&
    !!(b.kujaDosham && b.kujaDosham !== "Don't Know");
  let mangPts = 5;
  let mangNote = "Incomplete Chevvai / Manglik info";
  if (bothKnown) {
    if (mangA === mangB) {
      mangPts = 14;
      mangNote = mangA ? "Both Manglik" : "Neither Manglik";
    } else {
      mangPts = 4;
      mangNote = "Manglik mismatch — discuss with family";
    }
  }
  points += mangPts;
  factors.push({ name: "Chevvai / Manglik", points: mangPts, max: 14, note: mangNote });

  const percent = Math.round((points / 40) * 100);
  let label = "Exploratory match";
  if (percent >= 80) label = "Strong indication";
  else if (percent >= 60) label = "Favorable indication";
  else if (percent >= 40) label = "Mixed indication";
  else label = "Weak indication";

  return {
    percent,
    factors,
    label,
    disclaimer:
      "Indicative community match only — not a Vedic Ashtakoota / certified horoscope report.",
  };
}
