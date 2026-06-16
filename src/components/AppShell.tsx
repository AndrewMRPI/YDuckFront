"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  clearSession,
  fallbackSession,
  readStoredSession,
  refreshSession,
  Session,
  signOut,
} from "@/services/yduckApiClient";

const guestTabs = [
  { href: "/overall-match-history", label: "Overall Match History" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const adminTabs = [
  { href: "/admin/match-history", label: "Modify Match History" },
  { href: "/admin/players", label: "Modify Players" },
];

export function AppShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session>(fallbackSession);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => {
        const stored = readStoredSession();
        if (!stored.authenticated || (requireAdmin && stored.role !== "admin")) {
          clearSession();
          router.replace("/");
          return null;
        }
        return refreshSession();
      })
      .then((fresh) => {
        if (!alive || !fresh) {
          return;
        }
        if (!fresh.authenticated || (requireAdmin && fresh.role !== "admin")) {
          clearSession();
          router.replace("/");
          return;
        }
        setSession(fresh);
        setChecking(false);
      })
      .catch(() => {
        if (alive) {
          clearSession();
          router.replace("/");
        }
      });

    return () => {
      alive = false;
    };
  }, [requireAdmin, router]);

  async function handleSignOut() {
    await signOut().catch(() => undefined);
    router.replace("/");
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-[#f7f2df] px-6 py-8 text-[#1f2720]">
        <p className="mx-auto max-w-5xl text-sm font-semibold">Yellow Ducky Corp</p>
      </main>
    );
  }

  const isAdmin = session.role === "admin";

  return (
    <main className="min-h-screen bg-[#f7f2df] text-[#1f2720]">
      <header className={`border-b ${isAdmin ? "border-[#b64a3f] bg-[#e2b92f]" : "border-[#ddce8c] bg-[#ffd84d]"}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5f4c00]">Yellow Ducky Corp</p>
            <h1 className="text-3xl font-bold">Quack?</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="rounded-md border border-[#9d2f28] bg-[#fff3f0] px-3 py-2 text-sm font-semibold text-[#8a261f]">Admin</span>
            )}
            <button
              className="h-10 rounded-md border border-[#8b7000] bg-white px-3 text-sm font-semibold hover:bg-[#fff8d4]"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-4">
          {guestTabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                className={`h-10 shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${
                  active ? "bg-[#1f2720] text-white" : "bg-white/70 text-[#1f2720] hover:bg-white"
                }`}
                href={tab.href}
                key={tab.href}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {isAdmin && (
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-4">
            {adminTabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  className={`h-10 shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${
                    active ? "bg-[#8a261f] text-white" : "bg-[#fff3f0] text-[#8a261f] hover:bg-white"
                  }`}
                  href={tab.href}
                  key={tab.href}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <div className="mx-auto max-w-6xl px-5 py-7">{children}</div>
    </main>
  );
}
