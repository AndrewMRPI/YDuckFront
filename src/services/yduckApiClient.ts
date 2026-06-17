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
export type AddMatchRequest = ApiSchemas["AddMatchRequest"];

export type YduckData = {
  matches: Match[];
  players: Player[];
};

const sessionKey = "yduck:session:v1";
const sessionTokenKey = "yduck:session-token:v1";
const debugPrefix = "[yduck]";

export const fallbackSession: Session = {
  authenticated: false,
  role: "public_guest",
};

export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
}

export function debugLog(event: string, details: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }
  console.info(debugPrefix, event, {
    ...details,
    pageOrigin: window.location.origin,
    apiBaseUrl: apiBaseUrl(),
    userAgent: window.navigator.userAgent,
  });
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  const method = init?.method || "GET";
  const sessionToken = readStoredSessionToken();
  let response: Response;
  try {
    debugLog("api_request:start", { method, path, credentials: "include", hasBearerToken: Boolean(sessionToken) });
    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    debugLog("api_request:network_error", {
      method,
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Could not reach API at ${apiBaseUrl()}. Check that the backend is running and allows this frontend origin.`);
  }

  debugLog("api_request:response", { method, path, status: response.status, ok: response.ok });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    debugLog("api_request:error_body", {
      method,
      path,
      status: response.status,
      error: typeof data.error === "string" ? data.error : "unknown",
    });
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
  debugLog("session:store", { authenticated: session.authenticated, role: session.role });
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  if (session.sessionToken) {
    debugLog("session_token:store", { role: session.role });
    window.localStorage.setItem(sessionTokenKey, session.sessionToken);
  }
}

export function clearSession() {
  debugLog("session:clear");
  window.localStorage.removeItem(sessionKey);
  window.localStorage.removeItem(sessionTokenKey);
}

function readStoredSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(sessionTokenKey) || "";
}

export async function refreshSession() {
  const session = await apiRequest<Session>("/auth/session");
  debugLog("session:refresh", { authenticated: session.authenticated, role: session.role });
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

export async function loadPlayers() {
  const response = await apiRequest<ListPlayersResponse>("/api/players");
  return response.players || [];
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
