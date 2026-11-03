import { getApiClient } from "../client";
import type { ApiResponse } from "@camatrimony/shared";

export async function getFavorites(userId: string): Promise<ApiResponse<any[]>> {
  return getApiClient().get(`/favorites?userId=${userId}`);
}

export async function addFavorite(userId: string, favoritedUserId: string): Promise<ApiResponse<any>> {
  return getApiClient().post("/favorites", { userId, favoritedUserId });
}

export async function removeFavorite(userId: string, favoritedUserId: string): Promise<ApiResponse<any>> {
  return getApiClient().delete(`/favorites?userId=${userId}&favoritedUserId=${favoritedUserId}`);
}
