import type { ProfileSelectOption } from "./profile-fields";

export const MATCH_SORT_OPTIONS: ProfileSelectOption[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Verified First", value: "verified_first" },
  { label: "Newest Members", value: "newest" },
  { label: "Recently Active", value: "last_active" },
];

export const DEGREE_FILTER_OPTIONS: ProfileSelectOption[] = [
  { label: "All Qualifications", value: "" },
  { label: "Chartered Accountant (CA)", value: "CA" },
  { label: "Company Secretary (CS)", value: "CS" },
  { label: "Cost Accountant (CMA)", value: "CMA" },
  { label: "MBA Finance", value: "MBA" },
  { label: "CFA Analyst", value: "CFA" },
];

export const RELIGION_FILTER_OPTIONS: ProfileSelectOption[] = [
  { label: "All Religions", value: "" },
  { label: "Hinduism", value: "Hindu" },
  { label: "Sikhism", value: "Sikh" },
  { label: "Jainism", value: "Jain" },
  { label: "Christianity", value: "Christian" },
];
