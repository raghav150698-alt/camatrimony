export interface ProfileSelectOption {
  label: string;
  value: string;
}

export const PROFILE_CREATED_BY_OPTIONS: ProfileSelectOption[] = [
  { label: "Self (Candidate)", value: "Self" },
  { label: "Parent (Father / Mother)", value: "Parent" },
  { label: "Sibling (Brother / Sister)", value: "Sibling" },
  { label: "Relative", value: "Relative" },
  { label: "Friend", value: "Friend" },
];

export const DIET_OPTIONS: ProfileSelectOption[] = [
  { label: "Pure Vegetarian", value: "Vegetarian" },
  { label: "Eggetarian", value: "Eggetarian" },
  { label: "Non-Vegetarian", value: "Non-Veg" },
];

export const MARITAL_STATUS_OPTIONS: ProfileSelectOption[] = [
  { label: "Never Married", value: "Never Married" },
  { label: "Divorced", value: "Divorced" },
  { label: "Widowed", value: "Widowed" },
  { label: "Awaiting Divorce", value: "Awaiting Divorce" },
];

export const PHYSICAL_STATUS_OPTIONS: ProfileSelectOption[] = [
  { label: "Normal", value: "Normal" },
  { label: "Physically Challenged", value: "Physically Challenged" },
];

export const RELIGION_OPTIONS: ProfileSelectOption[] = [
  { label: "Hinduism", value: "Hindu" },
  { label: "Sikhism", value: "Sikh" },
  { label: "Jainism", value: "Jain" },
  { label: "Christianity", value: "Christian" },
  { label: "Islam", value: "Muslim" },
];

export const HIGHEST_DEGREE_OPTIONS: ProfileSelectOption[] = [
  { label: "Chartered Accountant (CA)", value: "Chartered Accountant (CA)" },
  { label: "Company Secretary (CS)", value: "Company Secretary (CS)" },
  { label: "Cost Accountant (CMA)", value: "Cost Accountant (CMA)" },
  { label: "MBA (Finance)", value: "MBA (Finance)" },
  { label: "CFA L3 / Chartered Analyst", value: "CFA L3 / Chartered Analyst" },
  { label: "Post Graduate / Doctor", value: "Post Graduate / Doctor" },
  { label: "Other Professional Graduate", value: "Other High Professional" },
];

export const EMPLOYED_IN_OPTIONS: ProfileSelectOption[] = [
  { label: "Private Corporate", value: "Private Sector" },
  { label: "Govt / PSU", value: "Govt Sector" },
  { label: "Business / Entrepreneur", value: "Business Owner" },
  { label: "Self Employed Practice", value: "Self-Employed" },
];

export const ANNUAL_INCOME_OPTIONS: ProfileSelectOption[] = [
  { label: "₹7 — ₹10 LPA", value: "₹7 - ₹10 LPA" },
  { label: "₹10 — ₹15 LPA", value: "₹10 - ₹15 LPA" },
  { label: "₹15 — ₹20 LPA", value: "₹15 - ₹20 LPA" },
  { label: "₹20 — ₹30 LPA", value: "₹20 - ₹30 LPA" },
  { label: "₹30 LPA+", value: "₹30 LPA+" },
];

export const FAMILY_STATUS_OPTIONS: ProfileSelectOption[] = [
  { label: "Middle Class", value: "Middle Class" },
  { label: "Upper-Middle Class", value: "Upper-Middle Class" },
  { label: "Rich / Elite Family", value: "Rich / Business Family" },
];

export const FAMILY_TYPE_OPTIONS: ProfileSelectOption[] = [
  { label: "Nuclear Family", value: "Nuclear" },
  { label: "Joint Family", value: "Joint" },
];

export const FAMILY_VALUES_OPTIONS: ProfileSelectOption[] = [
  { label: "Traditional", value: "Traditional" },
  { label: "Moderate", value: "Moderate" },
  { label: "Liberal", value: "Liberal" },
];

export function toSelectOptions(values: readonly string[]): ProfileSelectOption[] {
  return values.map((value) => ({ label: value, value }));
}
