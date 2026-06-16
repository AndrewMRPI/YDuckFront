"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadYduckData, Match, Player, YduckData } from "@/services/yduckApiClient";
import { calculateGamePoints } from "@/scoring/gamePoints";
import { rankedMatchPlayers } from "@/utils/matchPlayers";

type LeaderboardStatus = "active" | "provisional";

type LeaderboardRow = {
  playerId: string;
  playerName: string;
  rank: number | null;
  status: LeaderboardStatus;
  score: number;
  activeScore: number;
  totalScore: number;
  activeGames: number;
  totalGames: number;
  placeCounts: number[];
};

const activeWindowMonths = 3;
const activeGameMinimum = 3;

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function statusLabel(row: LeaderboardRow) {
  if (row.status === "active") {
    return "Gamer";
  }
  return "Provisional";
}

function subtractMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() - months);
  return next;
}

function formatPlayerName(playerId: string, playersById: Map<string, Player>, fallback = "") {
  return playersById.get(playerId)?.name || fallback || playerId;
}

function placePercent(placeCount: number, totalGames: number) {
  if (totalGames === 0) {
    return "-";
  }

  return `${Math.round((placeCount / totalGames) * 100)}%`;
}

function calculateLeaderboardRows(matches: Match[], players: Player[], now = new Date()): LeaderboardRow[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const windowStart = subtractMonths(now, activeWindowMonths);
  const rows = new Map<
    string,
    Omit<LeaderboardRow, "rank" | "status" | "score">
  >();

  function ensureRow(playerId: string, playerName = "") {
    const existing = rows.get(playerId);
    if (existing) {
      if (!existing.playerName || existing.playerName === playerId) {
        existing.playerName = formatPlayerName(playerId, playersById, playerName);
      }
      return existing;
    }

    const row = {
      playerId,
      playerName: formatPlayerName(playerId, playersById, playerName),
      activeScore: 0,
      totalScore: 0,
      activeGames: 0,
      totalGames: 0,
      placeCounts: [0, 0, 0, 0],
    };
    rows.set(playerId, row);
    return row;
  }

  players.forEach((player) => ensureRow(player.id, player.name));

  // The page owns aggregation and active-window rules; scoring only converts one match.
  matches.forEach((match) => {
    const matchTime = new Date(match.gameTime);
    const isActiveWindow = !Number.isNaN(matchTime.getTime()) && matchTime >= windowStart && matchTime <= now;
    const gamePointsByPlayer = new Map(calculateGamePoints(match).map((result) => [result.playerId, result.gamePoints]));

    rankedMatchPlayers(match).forEach((player) => {
      const row = ensureRow(player.playerId, player.playerName);
      const gamePoints = gamePointsByPlayer.get(player.playerId) || 0;
      row.totalGames += 1;
      row.totalScore += gamePoints;
      row.placeCounts[player.effectivePlace - 1] += 1;

      if (isActiveWindow) {
        row.activeGames += 1;
        row.activeScore += gamePoints;
      }
    });
  });

  const withStats: LeaderboardRow[] = Array.from(rows.values()).map((row) => {
    const status: LeaderboardStatus = row.activeGames >= activeGameMinimum ? "active" : "provisional";
    const score = row.activeScore;

    return {
      ...row,
      rank: null,
      status,
      score,
    };
  });

  // Only active players receive official ranks; provisional rows stay visible.
  const activeRows = withStats
    .filter((row) => row.status === "active")
    .sort((a, b) => b.activeScore - a.activeScore || b.totalScore - a.totalScore || a.playerName.localeCompare(b.playerName));

  activeRows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return withStats.sort((a, b) => {
    const statusOrder = { active: 0, provisional: 1 };
    return (
      statusOrder[a.status] - statusOrder[b.status] ||
      b.activeScore - a.activeScore ||
      b.totalGames - a.totalGames ||
      a.playerName.localeCompare(b.playerName)
    );
  });
}

export default function LeaderboardPage() {
  const [data, setData] = useState<YduckData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    loadYduckData()
      .then((next) => {
        if (alive) {
          setData(next);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : "Unable to load leaderboard.");
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
  }, []);

  const rows = useMemo(() => calculateLeaderboardRows(data?.matches || [], data?.players || []), [data]);
  const hasActiveRows = rows.some((row) => row.status === "active");

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-sm text-[#697061]">Scores use total game points from matches in the last 3 months.</p>
        </div>

        {loading && <p className="text-sm text-[#697061]">Loading leaderboard...</p>}
        {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}

        {!loading && !error && rows.length === 0 && <p className="text-sm text-[#697061]">No players yet.</p>}
        {!loading && !error && rows.length > 0 && !hasActiveRows && (
          <p className="rounded-md border border-[#ded2a3] bg-white p-3 text-sm text-[#697061]">
            No players have 3 games in the active window yet. Scores below are provisional.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#ded2a3] bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#ded2a3] bg-[#fff8d4] text-[#5f4c00]">
                <tr>
                  <th className="px-4 py-3 font-bold">Rank</th>
                  <th className="px-4 py-3 font-bold">Player</th>
                  <th className="px-4 py-3 font-bold">Score</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Games</th>
                  <th className="px-4 py-3 font-bold">1st</th>
                  <th className="px-4 py-3 font-bold">2nd</th>
                  <th className="px-4 py-3 font-bold">3rd</th>
                  <th className="px-4 py-3 font-bold">4th</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-b border-[#eee5be] last:border-0" key={row.playerId}>
                    <td className="px-4 py-3 font-semibold">{row.rank || "-"}</td>
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]"
                        href={`/player/${encodeURIComponent(row.playerId)}`}
                      >
                        {row.playerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-bold">{signedNumber(row.score)}</td>
                    <td className="px-4 py-3 text-[#697061]">{statusLabel(row)}</td>
                    <td className="px-4 py-3 text-[#697061]">{row.activeGames}</td>
                    {row.placeCounts.map((placeCount, index) => (
                      <td className="px-4 py-3 text-[#697061]" key={`${row.playerId}-place-${index + 1}`}>
                        {placePercent(placeCount, row.totalGames)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
