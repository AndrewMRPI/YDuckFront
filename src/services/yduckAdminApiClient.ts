"use client";

import { AddMatchRequest, apiRequest, MatchResponse, PlayerResponse } from "@/services/yduckApiClient";

export async function deleteMatch(id: string) {
  await apiRequest<void>(`/api/matches/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addPlayer(name: string) {
  const response = await apiRequest<PlayerResponse>("/api/players", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return response.player;
}

export async function deletePlayer(id: string) {
  await apiRequest<void>(`/api/players/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addMatch(request: AddMatchRequest) {
  const response = await apiRequest<MatchResponse>("/api/matches", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response.match;
}

export async function editMatch(id: string, request: AddMatchRequest) {
  const response = await apiRequest<MatchResponse>(`/api/matches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
  return response.match;
}
