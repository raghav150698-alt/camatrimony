import { getApiClient } from "../client";
import type { CandidateProfile, ApiResponse } from "@camatrimony/shared";
import { normalizeCandidateProfile } from "@camatrimony/shared";

export interface ProfileSearchParams {
  page?: number;
  pageSize?: number;
  gender?: string;
  religion?: string;
  caste?: string;
  ageMin?: number;
  ageMax?: number;
  query?: string;
  location?: string;
  degree?: string;
  isNri?: boolean;
  sortBy?: string;
}

export async function getProfiles(
  params: ProfileSearchParams = {}
): Promise<ApiResponse<CandidateProfile[]>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append("page", String(params.page));
  if (params.pageSize !== undefined) query.append("limit", String(params.pageSize));
  if (params.gender) query.append("gender", params.gender);
  if (params.religion) query.append("religion", params.religion);
  if (params.caste) query.append("caste", params.caste);
  if (params.ageMin !== undefined) query.append("minAge", String(params.ageMin));
  if (params.ageMax !== undefined) query.append("maxAge", String(params.ageMax));
  const location = params.location || params.query;
  if (location) query.append("location", location);
  if (params.degree) query.append("degree", params.degree);
  if (params.isNri === true) query.append("isNri", "true");
  if (params.sortBy) query.append("sortBy", params.sortBy);
  const response = await getApiClient().get<CandidateProfile[]>(`/profiles?${query.toString()}`);
  if (response.success && Array.isArray(response.data)) response.data = response.data.map(profile => normalizeCandidateProfile(profile as unknown as Record<string, unknown>));
  return response;
}

export async function getProfileByUserId(userId: string): Promise<ApiResponse<CandidateProfile>> {
  const response = await getApiClient().get<CandidateProfile>(`/profiles/${encodeURIComponent(userId)}`);
  if (response.success && response.data) response.data = normalizeCandidateProfile(response.data as unknown as Record<string, unknown>);
  return response;
}
