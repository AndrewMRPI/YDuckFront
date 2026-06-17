"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearSession, debugLog, loadYduckData, refreshSession, Session, storeSession } from "@/services/yduckApiClient";

export default function SignOnPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishSignIn(session: Session) {
    debugLog("sign_in:accepted", { authenticated: session.authenticated, role: session.role });
    await apiRequest<Session>("/auth/session")
      .then((confirmed) => {
        debugLog("sign_in:cookie_session_check", { authenticated: confirmed.authenticated, role: confirmed.role });
      })
      .catch((error) => {
        debugLog("sign_in:cookie_session_check_failed", { error: error instanceof Error ? error.message : String(error) });
      });
    storeSession(session);
    await loadYduckData()
      .then(() => {
        debugLog("sign_in:data_preload_success");
      })
      .catch((error) => {
        debugLog("sign_in:data_preload_failed", { error: error instanceof Error ? error.message : String(error) });
      });
    router.replace("/overall-match-history");
  }

  async function submitGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password === "Admin") {
      setPassword("");
      setStatus("");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      debugLog("sign_in:submit", { mode: "guest", passwordLength: password.length });
      clearSession();
      const session = await apiRequest<Session>("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await finishSignIn(session);
    } catch (error) {
      debugLog("sign_in:failed", { mode: "guest", error: error instanceof Error ? error.message : String(error) });
      setStatus("No");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      debugLog("sign_in:submit", { mode: "admin", passwordLength: adminPassword.length });
      clearSession();
      const session = await apiRequest<Session>("/auth/admin/sign-in", {
        method: "POST",
        body: JSON.stringify({ password: adminPassword }),
      });
      await finishSignIn(session);
    } catch (error) {
      debugLog("sign_in:failed", { mode: "admin", error: error instanceof Error ? error.message : String(error) });
      setStatus("No");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshSession()
      .then((session) => {
        debugLog("sign_in:initial_session", { authenticated: session.authenticated, role: session.role });
        if (session.authenticated) {
          router.replace("/overall-match-history");
        }
      })
      .catch((error) => {
        debugLog("sign_in:initial_session_failed", { error: error instanceof Error ? error.message : String(error) });
        clearSession();
      });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#ffd84d] text-[#1f2720]">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-5xl font-black sm:text-6xl">Yellow Ducky Corp</h1>
            <p className="text-3xl font-bold">Quack?</p>
          </header>

          <form className="flex gap-3" onSubmit={submitGuest}>
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="h-12 min-w-0 flex-1 rounded-md border border-[#9b7d00] bg-white px-4 text-lg outline-none focus:border-[#1f2720] focus:ring-2 focus:ring-[#1f2720]/20"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => {
                const nextPassword = event.target.value;
                setPassword(nextPassword);
                setAdminMode(nextPassword === "Admin");
                if (nextPassword === "Admin") {
                  setStatus("");
                }
              }}
            />
            <button
              className="h-12 rounded-md bg-[#1f2720] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || password.length === 0}
              type="submit"
            >
              Go
            </button>
          </form>

          {adminMode && (
            <form className="flex gap-3" onSubmit={submitAdmin}>
              <label className="sr-only" htmlFor="admin-password">
                Admin password
              </label>
              <input
                id="admin-password"
                className="h-12 min-w-0 flex-1 rounded-md border border-[#9b7d00] bg-white px-4 text-lg outline-none focus:border-[#1f2720] focus:ring-2 focus:ring-[#1f2720]/20"
                autoComplete="current-password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
              <button
                className="h-12 rounded-md bg-[#1f2720] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || adminPassword.length === 0}
                type="submit"
              >
                Admin
              </button>
            </form>
          )}

          <p className="min-h-6 text-sm font-semibold text-[#704e00]" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </main>
  );
}
