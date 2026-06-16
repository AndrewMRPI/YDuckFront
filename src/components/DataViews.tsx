"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CachedYduckData, loadYduckData, Match } from "@/services/yduckApiClient";
import { durationLabel, roundedHourDate } from "@/utils/matchFormatting";

function useYduckData() {
  const [data, setData] = useState<CachedYduckData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload(force = false) {
    setLoading(true);
    setError("");
    try {
      const next = await loadYduckData(force);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return { data, error, loading };
}

export function MatchList() {
  const { data, error, loading } = useYduckData();

  function playerHref(player: Match["players"][number]) {
    return `/player/${encodeURIComponent(player.playerId)}`;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Overall Match History</h2>
      </div>
      {loading && <p className="text-sm text-[#697061]">Loading matches...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      <div className="grid gap-3">
        {data?.matches.map((match) => {
          return (
            <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm" key={match.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#697061]">Duration {durationLabel(match.durationSeconds)}</p>
                  <h3 className="text-xl font-bold">{roundedHourDate(match.gameTime)}</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[...match.players]
                  .sort((a, b) => a.place - b.place)
                  .map((player) => (
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
              {match.notes && <p className="mt-3 text-sm text-[#555d52]">{match.notes}</p>}
            </article>
          );
        })}
      </div>
      {!loading && data?.matches.length === 0 && <p className="text-sm text-[#697061]">No matches yet.</p>}
    </section>
  );
}
