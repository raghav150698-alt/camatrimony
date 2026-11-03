import { getApiClient } from "../client";
import type { Report, ApiResponse } from "@camatrimony/shared";

export async function getReports(): Promise<ApiResponse<Report[]>> {
  return getApiClient().get("/reports");
}

export async function createReport(
  reporterId: string,
  reportedId: string,
  reason: string,
  details?: string
): Promise<ApiResponse<Report>> {
  return getApiClient().post("/reports", { reporterId, reportedId, reason, details });
}

export async function updateReport(
  reportId: number,
  status: string,
  adminNotes?: string
): Promise<ApiResponse<Report>> {
  return getApiClient().patch(`/reports/${reportId}`, { status, adminNotes });
}
