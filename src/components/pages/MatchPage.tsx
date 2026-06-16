"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { calculateGamePointBreakdowns } from "@/scoring/gamePoints";
import { loadMatch, Match } from "@/services/yduckApiClient";
import { gameTypeLabel, niceDate, roundedHourDate } from "@/utils/matchFormatting";
import { rankedMatchPlayers, seatLabel } from "@/utils/matchPlayers";

type MatchPageProps = {
  id: string;
};

function playerHref(player: Match["players"][number]) {
  return `/player/${encodeURIComponent(player.playerId)}`;
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function placementLabel(place: number) {
  return `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
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

  const players = useMemo(() => (match ? rankedMatchPlayers(match) : []), [match]);
  const gamePointsByPlayer = useMemo(() => {
    return new Map((match ? calculateGamePointBreakdowns(match) : []).map((result) => [result.playerId, result]));
  }, [match]);

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
              {players.map((player) => {
                const breakdown = gamePointsByPlayer.get(player.playerId);
                const adjustmentText = breakdown?.adjustment ? ` ${signedNumber(breakdown.adjustment)} adj` : "";
                const formulaAdjustmentText = breakdown?.adjustment ? ` ${signedNumber(breakdown.adjustment)} table adjustment` : "";

                return (
                  <div className="rounded-md border border-[#eee5be] bg-[#fffdf3] p-3" key={`${match.id}-${player.playerId}`}>
                    <p className="font-semibold">
                      {placementLabel(player.effectivePlace)} - {seatLabel(player.seatIndex)}{" "}
                      <Link className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]" href={playerHref(player)}>
                        {player.playerName || player.playerId}
                      </Link>
                    </p>
                    <p className="text-sm text-[#697061]">Score {player.score}</p>
                    {breakdown && (
                      <p
                        className="mt-2 text-sm font-semibold text-[#5f4c00] underline decoration-dotted decoration-[#b9aa70] underline-offset-4"
                        title={`roundHalfDown((${player.score} - ${breakdown.startingPoints}) / 1000) ${signedNumber(breakdown.uma)}${formulaAdjustmentText} = ${signedNumber(breakdown.gamePoints)}`}
                      >
                        {signedNumber(breakdown.basePoints)} base {signedNumber(breakdown.uma)} uma{adjustmentText} = {signedNumber(breakdown.gamePoints)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {match.notes && <p className="mt-4 text-sm text-[#555d52]">{match.notes}</p>}
          </article>
        )}
      </section>
    </AppShell>
  );
}
