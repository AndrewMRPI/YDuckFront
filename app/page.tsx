"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Session = {
  authenticated: boolean;
  role: "public_guest" | "enhanced_guest";
};

const fallbackSession: Session = {
  authenticated: false,
  role: "public_guest",
};

export default function Home() {
  const apiBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, ""),
    [],
  );
  const [session, setSession] = useState<Session>(fallbackSession);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Checking session...");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data as Session;
  }, [apiBaseUrl]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await request("/auth/session");
      setSession(data);
      setStatus(data.authenticated ? "Enhanced guest access is active." : "Public guest access is active.");
    } catch (error) {
      setSession(fallbackSession);
      setStatus(error instanceof Error ? error.message : "Unable to reach the API.");
    }
  }, [request]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Signing in...");
    try {
      const data = await request("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setSession(data);
      setPassword("");
      setStatus("Enhanced guest access is active.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setStatus("Signing out...");
    try {
      const data = await request("/auth/sign-out", { method: "POST" });
      setSession(data);
      setStatus("Public guest access is active.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-out failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1e2420]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
        <div className="space-y-8">
          <section className="space-y-4">
            <p className="text-sm font-semibold uppercase text-[#2f6f5e]">Yellow Ducky Corp</p>
            <h1 className="text-5xl font-semibold text-balance sm:text-6xl">Hello world</h1>
            <p className="max-w-xl text-lg leading-8 text-[#5e675f]">
              Public guests can view the site. The shared password unlocks enhanced guest mode through the
              Cloud Run API.
            </p>
          </section>

          <section className="rounded-lg border border-[#d9ded7] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#5e675f]">Session</p>
                <p className="text-2xl font-semibold">
                  {session.authenticated ? "Enhanced guest" : "Public guest"}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-[#e0efe9] px-3 py-1 text-sm font-semibold text-[#2f6f5e]">
                {session.role}
              </span>
            </div>
            <p className="mt-4 min-h-7 text-sm text-[#5e675f]" aria-live="polite">
              {status}
            </p>
          </section>

          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={signIn}>
            <label className="sr-only" htmlFor="password">
              Shared password
            </label>
            <input
              id="password"
              className="h-12 rounded-md border border-[#cbd4cc] bg-white px-4 text-base outline-none transition focus:border-[#2f6f5e] focus:ring-2 focus:ring-[#2f6f5e]/20"
              autoComplete="current-password"
              type="password"
              value={password}
              placeholder="Shared password"
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="h-12 rounded-md bg-[#2f6f5e] px-5 font-semibold text-white transition hover:bg-[#25594c] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || password.length === 0}
              type="submit"
            >
              Sign in
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <button
              className="h-11 rounded-md border border-[#cbd4cc] bg-white px-4 font-medium transition hover:border-[#2f6f5e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="button"
              onClick={refreshSession}
            >
              Refresh
            </button>
            <button
              className="h-11 rounded-md border border-[#cbd4cc] bg-white px-4 font-medium transition hover:border-[#2f6f5e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || !session.authenticated}
              type="button"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
