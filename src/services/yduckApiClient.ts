"use client";

import type { ApiSchemas } from "@/types/generatedApiTypes";

export type Role = ApiSchemas["SessionResponse"]["role"];
export type Session = ApiSchemas["SessionResponse"];
export type Player = ApiSchemas["Player"];
export type Match = ApiSchemas["Match"];
export type ListMatchesResponse = ApiSchemas["ListMatchesResponse"];
export type ListPlayersResponse = ApiSchemas["ListPlayersResponse"];
export type MatchResponse = ApiSchemas["MatchResponse"];
export type PlayerResponse = ApiSchemas["PlayerResponse"];

export type YduckData = {
  matches: Match[];
  players: Player[];
};

const sessionKey = "yduck:session:v1";

export const fallbackSession: Session = {
  authenticated: false,
  role: "public_guest",
};

export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(`Could not reach API at ${apiBaseUrl()}. Check that the backend is running and allows this frontend origin.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export function readStoredSession(): Session {
  if (typeof window === "undefined") {
    return fallbackSession;
  }

  try {
    const raw = window.localStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as Session) : fallbackSession;
  } catch {
    return fallbackSession;
  }
}

export function storeSession(session: Session) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

export async function refreshSession() {
  const session = await apiRequest<Session>("/auth/session");
  storeSession(session);
  return session;
}

export async function loadYduckData(): Promise<YduckData> {
  const [matchesResponse, playersResponse] = await Promise.all([
    apiRequest<ListMatchesResponse>("/api/matches"),
    apiRequest<ListPlayersResponse>("/api/players"),
  ]);

  return {
    matches: matchesResponse.matches || [],
    players: playersResponse.players || [],
  };
}

export async function loadMatch(id: string) {
  const response = await apiRequest<MatchResponse>(`/api/matches/${encodeURIComponent(id)}`);
  return response.match;
}

export async function loadMatchesByPlayer(playerId: string) {
  const response = await apiRequest<ListMatchesResponse>(`/api/matches?playerId=${encodeURIComponent(playerId)}`);
  return response.matches || [];
}

export async function signOut() {
  const session = await apiRequest<Session>("/auth/sign-out", { method: "POST" });
  clearSession();
  return session;
}
