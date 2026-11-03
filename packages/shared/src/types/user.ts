// Role Types
export type AdminRole = "super_admin" | "moderator" | "support_agent";

export interface AuthUser {
  id: string;
  email: string | null;
  role: "user" | AdminRole;
  isBanned: boolean;
}

export interface DBUserProfile {
  fullName: string;
  profileCreatedBy: string;
  gender: string;
  diet: string;
  age: number;
  height: string;
  weight: number;
  maritalStatus: string;
  motherTongue: string;
  religion: string;
  caste: string;
  subcaste: string;
  gothram: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  rasi: string;
  nakshatram: string;
  kujaDosham: string;
  physicalStatus: string;
  highestDegree: string;
  employedIn: string;
  occupation: string;
  annualIncome: string;
  workLocation: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isNri: boolean;
  familyStatus: string;
  familyType: string;
  familyValues: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblingCount: number;
  partnerAgeRange: string;
  partnerCaste: string;
  partnerEducation: string;
  partnerIncomeMin: string;
  isOnboardingCompleted: boolean;
  completionPercentage: number;
  govtIdFile?: string;
  degreeFile?: string;
  photos?: string[];
  paymentProofUrl?: string;
  role?: string;
  aboutMe?: string;
}

