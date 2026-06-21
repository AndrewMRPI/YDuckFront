"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Match, YduckData } from "@/services/yduckApiClient";
import { gameTypeLabel, roundedHourDate } from "@/utils/matchFormatting";
import { placedMatchPlayers, seatLabel } from "@/utils/matchPlayers";

type MatchHistoryViewProps = {
  data: YduckData | null;
  error: string;
  loading: boolean;
  action?: (match: Match) => ReactNode;
  actionError?: string;
};

function placementLabel(place: number) {
  return `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
}

function matchHref(match: Match) {
  return `/match/${encodeURIComponent(match.id)}`;
}

function playerHref(player: Match["players"][number]) {
  return `/player/${encodeURIComponent(player.playerId)}`;
}

export function MatchHistoryView({ data, error, loading, action, actionError }: MatchHistoryViewProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Overall Match History</h2>
      </div>
      {loading && <p className="text-sm text-[#697061]">Loading matches...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      {actionError && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{actionError}</p>}
      <div className="grid gap-3">
        {data?.matches.map((match) => (
          <article
            className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm"
            key={match.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#697061]">{gameTypeLabel(match.gameType)}</p>
                <h3 className="text-xl font-bold">
                  <Link className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]" href={matchHref(match)}>
                    {roundedHourDate(match.gameTime)}
                  </Link>
                </h3>
              </div>
              {action?.(match)}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {placedMatchPlayers(match).map((player) => (
                <div className="rounded-md border border-[#eee5be] bg-[#fffdf3] p-3" key={`${match.id}-${player.playerId}`}>
                  <p className="font-semibold">
                    {placementLabel(player.effectivePlace)} -{" "}
                    <Link className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]" href={playerHref(player)}>
                      {player.playerName || player.playerId}
                    </Link>{" "}
                    - {seatLabel(player.seatIndex)}
                  </p>
                  <p className="text-sm text-[#697061]">Score {player.score}</p>
                </div>
              ))}
            </div>
            {match.notes && <p className="mt-3 text-sm text-[#555d52]">{match.notes}</p>}
          </article>
        ))}
      </div>
      {!loading && data?.matches.length === 0 && <p className="text-sm text-[#697061]">No matches yet.</p>}
    </section>
  );
}
