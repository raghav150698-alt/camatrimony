import { scorePreferenceMatch } from "@camatrimony/shared";

// Fictional data only. This transport never calls the production API.
const people = [
  ["ananya", "Ananya Sharma", 27, "Brahmin", "Chartered Accountant (CA)", "Audit Manager", "₹20 - ₹30 LPA", "Bengaluru", "photo-1580489944761-15a19d654956"],
  ["meera", "Meera Reddy", 26, "Reddy", "Company Secretary (CS)", "Company Secretary", "₹15 - ₹20 LPA", "Hyderabad", "photo-1534528741775-53994a69daeb"],
  ["nandini", "Nandini Rao", 29, "Brahmin", "Chartered Accountant (CA)", "Tax Consultant", "₹30 - ₹40 LPA", "Chennai", "photo-1551836022-d5d88e9218df"],
  ["aisha", "Aisha Khan", 26, "Sunni", "MBA Finance", "Strategy Consultant", "₹20 - ₹30 LPA", "Mumbai", "photo-1494790108377-be9c29b29330"],
  ["priya", "Priya Nair", 30, "Nair", "Company Secretary (CS)", "Compliance Manager", "₹15 - ₹20 LPA", "Kochi", "photo-1531123897727-8f129e1688ce"],
  ["sneha", "Sneha Iyer", 28, "Brahmin", "Cost Accountant (CMA)", "Finance Manager", "₹20 - ₹30 LPA", "Pune", "photo-1544005313-94ddf0286df2"],
] as const;

export const previewProfiles = people.map(([slug, fullName, age, caste, highestDegree, occupation, annualIncome, city, photo], index) => ({
  userId: "review-match-" + slug, fullName, name: fullName, age, caste, highestDegree, occupation, annualIncome,
  city, state: ["Karnataka", "Telangana", "Tamil Nadu", "Maharashtra", "Kerala", "Maharashtra"][index],
  country: "India", workLocation: city, gender: "Female", height: "5ft 5in", weight: 58,
  profileCreatedBy: "Self", maritalStatus: "Never married", motherTongue: ["Hindi", "Telugu", "Telugu", "Hindi", "Malayalam", "Tamil"][index],
  diet: "Vegetarian", religion: caste === "Sunni" ? "Muslim" : "Hindu", subcaste: "Not specified", gothram: "Not specified",
  physicalStatus: "Normal", employedIn: "Private sector", familyStatus: "Upper middle class", familyType: "Nuclear",
  familyValues: "Moderate", fatherOccupation: "Retired", motherOccupation: "Teacher", siblingCount: 1,
  birthDate: (2026 - age) + "-05-12", birthTime: "08:30", birthPlace: city, rasi: "Vrishabha", nakshatram: "Rohini", kujaDosham: "No",
  partnerAgeRange: "27 - 35", partnerCaste: "Open to all", partnerEducation: "CA / CS / CMA", partnerIncomeMin: "₹15 LPA",
  isNri: false, isVerified: true, isFeatured: false, isOnboardingCompleted: true, completionPercentage: 100,
  canViewPhotos: true, photos: [`https://images.unsplash.com/${photo}?w=700&h=750&fit=crop&crop=faces`],
  aboutMe: "I enjoy travel, time with family and good conversations. Looking for a thoughtful partner who values a shared life.",
}));

const initialViewer = {
  ...previewProfiles[0], userId: "mock-user-review", fullName: "Arjun Rao", name: "Arjun Rao", gender: "Male", age: 30,
  occupation: "Finance Manager", partnerAgeRange: "25 - 29", partnerCaste: "Open to all", partnerIncomeMin: "₹15 LPA", partnerEducation: "CA / CS",
  photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=700&h=650&fit=crop&crop=faces"],
};
type State = { profile: Record<string, any>; favorites: string[]; interests: any[]; settings: Record<string, any> };
const initial = (): State => ({ profile: { ...initialViewer }, favorites: [], interests: [], settings: {
  hideProfile: false, hideContact: false, hideIncome: false, photoVisibility: "public",
  notifyInterests: true, notifyMessages: true, notifyKyc: true, notifyPayments: true,
} });
function state(): State {
  try { return JSON.parse(localStorage.getItem("camatrimony_client_preview_v1") || "null") || initial(); } catch { return initial(); }
}
function save(value: State) { localStorage.setItem("camatrimony_client_preview_v1", JSON.stringify(value)); }

export async function clientPreviewResponse(method: string, path: string, body?: any): Promise<any> {
  const url = new URL(path, "https://preview.invalid");
  const p = url.pathname, q = url.searchParams;
  const s = state();
  const ok = (data: any) => ({ success: true, ...data });
  const disabled = () => ({ success: false, error: "This action is unavailable in the client preview. No live data has been changed." });
  if (p === "/profile") {
    if (method === "POST") {
      // Persist only editable synthetic biodata. No identity/contact/document input.
      for (const key of Object.keys(initialViewer)) {
        if (!["userId", "isVerified", "isOnboardingCompleted", "canViewPhotos"].includes(key) && body?.[key] !== undefined) s.profile[key] = body[key];
      }
      save(s);
    }
    return ok({ profile: s.profile });
  }
  if (p === "/profiles") {
    let rows = previewProfiles.filter(row =>
      (!q.get("gender") || q.get("gender") === "all" || row.gender === q.get("gender"))
      && row.age >= Number(q.get("minAge") || 18) && row.age <= Number(q.get("maxAge") || 100)
      && (!q.get("caste") || row.caste.toLowerCase() === q.get("caste")!.toLowerCase())
      && (!q.get("religion") || row.religion === q.get("religion"))
      && (!q.get("location") || row.workLocation.toLowerCase().includes(q.get("location")!.toLowerCase()))
      && (!q.get("degree") || row.highestDegree.includes("(" + q.get("degree") + ")") || row.highestDegree.startsWith(q.get("degree")! + " "))
    ).map(row => ({ ...row, match: scorePreferenceMatch(s.profile, row) }));
    if (q.get("sortBy") === "recommended") rows.sort((a, b) => (b.match.score || 0) - (a.match.score || 0) || a.userId.localeCompare(b.userId));
    const page = Math.max(1, Number(q.get("page") || 1)), limit = Number(q.get("limit") || 20);
    return ok({ profiles: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } });
  }
  if (p.startsWith("/profiles/")) {
    const id = p.endsWith("/search-by-id") ? q.get("userId") : decodeURIComponent(p.slice("/profiles/".length));
    const profile = id === "mock-user-review" ? s.profile : previewProfiles.find(row => row.userId === id);
    return profile ? ok({ profile }) : { success: false, error: "Profile unavailable." };
  }
  if (p === "/favorites") {
    if (method === "POST" && previewProfiles.some(row => row.userId === body?.favoritedUserId)) s.favorites = [...new Set([...s.favorites, body.favoritedUserId])];
    if (method === "DELETE") s.favorites = s.favorites.filter(id => id !== q.get("favoritedUserId"));
    save(s);
    return ok({ favorites: s.favorites.map(id => ({ ...previewProfiles.find(row => row.userId === id), favoritedUserId: id })) });
  }
  if (p === "/interests") {
    if (method === "POST") {
      const profile = previewProfiles.find(row => row.userId === body?.receiverId);
      if (!profile) return disabled();
      if (!s.interests.some(row => row.receiverId === profile.userId)) s.interests.push({ ...profile, id: Date.now(), senderId: "mock-user-review", receiverId: profile.userId, sender_id: "mock-user-review", receiver_id: profile.userId, full_name: profile.fullName, highest_degree: profile.highestDegree, annual_income: profile.annualIncome, work_location: profile.workLocation, is_verified: 1, photos: JSON.stringify(profile.photos), status: "pending", createdAt: new Date().toISOString(), receiverName: profile.fullName });
      save(s);
    }
    return ok({ interests: q.get("direction") === "received" ? [] : s.interests });
  }
  if (p === "/user/settings") {
    if (method === "PATCH") { s.settings = { ...s.settings, ...body }; save(s); }
    return ok({ settings: s.settings });
  }
  if (method !== "GET") return disabled();
  if (p === "/payments/settings") return ok({ razorpayEnabled: false, manualPaymentEnabled: false, astrologyMatchEnabled: true });
  if (p === "/payments/subscription") return ok({ subscription: null });
  if (p === "/payments/packages") return ok({ packages: [] });
  if (p === "/stories") return ok({ stories: [] });
  if (p === "/notifications") return ok({ notifications: [], unreadCount: 0 });
  if (p === "/unlocks") return ok({ unlocks: [] });
  if (p === "/chat/conversations" || p === "/conversations") return ok({ conversations: [] });
  if (p === "/user/blocked" || p === "/block") return ok({ blockedUsers: [] });
  if (p === "/support/tickets" || p === "/support") return ok({ tickets: [] });
  if (p === "/payments") return ok({ payments: [] });
  return disabled();
}
