"use client";

import { apiRequest } from "@/services/yduckApiClient";

export async function deleteMatch(id: string) {
  await apiRequest<void>(`/api/matches/${encodeURIComponent(id)}`, { method: "DELETE" });
}
