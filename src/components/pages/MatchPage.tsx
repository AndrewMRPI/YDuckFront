"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadMatch, Match } from "@/services/yduckApiClient";
import { gameTypeLabel, niceDate, roundedHourDate } from "@/utils/matchFormatting";

type MatchPageProps = {
  id: string;
};

function playerHref(player: Match["players"][number]) {
  return `/player/${encodeURIComponent(player.playerId)}`;
}

export default function MatchPage({ id }: MatchPageProps) {
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

  const players = useMemo(() => [...(match?.players || [])].sort((a, b) => a.place - b.place), [match]);

  return (
    <AppShell>
      <section className="max-w-3xl space-y-4">
        <Link className="text-sm font-semibold text-[#5f4c00] underline decoration-[#b9aa70] underline-offset-4" href="/overall-match-history">
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
          <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[#697061]">{gameTypeLabel(match.gameType)}</p>
              <h2 className="text-2xl font-bold">
                {gameTypeLabel(match.gameType)} - {roundedHourDate(match.gameTime)}
              </h2>
              <p className="text-sm text-[#697061]">{niceDate(match.gameTime)}</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <div className="rounded-md border border-[#eee5be] bg-[#fffdf3] p-3" key={`${match.id}-${player.playerId}`}>
                  <p className="font-semibold">
                    {player.place}.{" "}
                    <Link className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]" href={playerHref(player)}>
                      {player.playerName || player.playerId}
                    </Link>
                  </p>
                  <p className="text-sm text-[#697061]">Score {player.score}</p>
                </div>
              ))}
            </div>

            {match.notes && <p className="mt-4 text-sm text-[#555d52]">{match.notes}</p>}
          </article>
        )}
      </section>
    </AppShell>
  );
}
