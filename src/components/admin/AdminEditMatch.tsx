"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminMatchForm } from "@/components/admin/AdminMatchForm";
import { editMatch } from "@/services/yduckAdminApiClient";
import { loadMatch, Match } from "@/services/yduckApiClient";

type AdminEditMatchProps = {
  id: string;
};

export function AdminEditMatch({ id }: AdminEditMatchProps) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    loadMatch(id)
      .then((next) => {
        if (alive) {
          setMatch(next);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : "Unable to load match.");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-[#5f4c00] underline decoration-[#b9aa70] underline-offset-4" href="/admin/match-history">
        Back to match history
      </Link>

      {loading && <p className="text-sm text-[#697061]">Loading match...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      {!loading && !error && !match && (
        <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold">Match not found</h2>
        </article>
      )}

      {match && (
        <AdminMatchForm
          heading="Edit Match"
          initialMatch={match}
          savingErrorFallback="Unable to edit match."
          submitLabel={{ idle: "Save Match", saving: "Saving..." }}
          onSubmit={async (request) => {
            await editMatch(id, request);
            router.replace("/admin/match-history");
          }}
        />
      )}
    </section>
  );
}
