import type { Package } from "../types/payment";

/** Default packages aligned to client Google Form pricing (admin/API remain source of truth). */
export const DEFAULT_PACKAGES: Package[] = [
  {
    id: 1,
    name: "6 Months",
    price: 999,
    validity_days: 180,
    contact_limit: 30,
    chat_allowed: 1,
    is_active: 1,
    is_custom: 0,
    features: JSON.stringify([
      "View up to 30 contacts",
      "Safe chat with accepted matches",
      "Profile listing for 6 months",
      "Standard support",
    ]),
  },
  {
    id: 2,
    name: "1 Year",
    price: 1800,
    validity_days: 365,
    contact_limit: 75,
    chat_allowed: 1,
    is_active: 1,
    is_custom: 0,
    features: JSON.stringify([
      "View up to 75 contacts",
      "Safe chat with accepted matches",
      "Featured profile priority",
      "Profile listing for 12 months",
      "Priority support",
    ]),
  },
];
