"use client";

import type { ApexOptions } from "apexcharts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { calculateGamePoints } from "@/scoring/gamePoints";
import { loadMatchesByPlayer, loadYduckData, Match, Player } from "@/services/yduckApiClient";
import { gameTypeLabel, niceDate } from "@/utils/matchFormatting";
import { rankedMatchPlayers, seatedMatchPlayers, seatLabel } from "@/utils/matchPlayers";

type PlayerPageProps = {
  id: string;
};

type PlacementPoint = {
  gamePoints: number;
  match: Match;
  place: number;
  score: number;
  totalScore: number;
};

type LeaderboardStatus = "active" | "provisional";

type LeaderboardRow = {
  activeGames: number;
  activeScore: number;
  placeCounts: number[];
  playerId: string;
  playerName: string;
  rank: number | null;
  score: number;
  status: LeaderboardStatus;
  totalGames: number;
  totalScore: number;
};

type PlayerPageState = {
  allMatches: Match[];
  error: string;
  loading: boolean;
  matches: Match[];
  name: string;
  players: Player[];
  playerId: string;
};

const activeWindowMonths = 3;
const activeGameMinimum = 3;

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function statusLabel(status: LeaderboardStatus) {
  if (status === "active") {
    return "Gamer";
  }
  return "Provisional";
}

function subtractMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() - months);
  return next;
}

function placePercent(placeCount: number, totalGames: number) {
  if (totalGames === 0) {
    return "-";
  }

  return `${Math.round((placeCount / totalGames) * 100)}%`;
}

function matchHref(match: Match) {
  return `/match/${encodeURIComponent(match.id)}`;
}

function getPlayerResult(match: Match, playerId: string) {
  return rankedMatchPlayers(match).find((player) => player.playerId === playerId);
}

function placementLabel(place: number) {
  return `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
}

function calculateLeaderboardRows(matches: Match[], players: Player[], now = new Date()): LeaderboardRow[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const windowStart = subtractMonths(now, activeWindowMonths);
  const rows = new Map<string, Omit<LeaderboardRow, "rank" | "score" | "status">>();

  function ensureRow(playerId: string, playerName = "") {
    const existing = rows.get(playerId);
    if (existing) {
      if (!existing.playerName || existing.playerName === playerId) {
        existing.playerName = playersById.get(playerId)?.name || playerName || playerId;
      }
      return existing;
    }

    const row = {
      activeGames: 0,
      activeScore: 0,
      placeCounts: [0, 0, 0, 0],
      playerId,
      playerName: playersById.get(playerId)?.name || playerName || playerId,
      totalGames: 0,
      totalScore: 0,
    };
    rows.set(playerId, row);
    return row;
  }

  players.forEach((player) => ensureRow(player.id, player.name));

  matches.forEach((match) => {
    const matchTime = new Date(match.gameTime);
    const isActiveWindow = !Number.isNaN(matchTime.getTime()) && matchTime >= windowStart && matchTime <= now;
    const gamePointsByPlayer = new Map(calculateGamePoints(match).map((result) => [result.playerId, result.gamePoints]));

    rankedMatchPlayers(match).forEach((player) => {
      const row = ensureRow(player.playerId, player.playerName);
      const gamePoints = gamePointsByPlayer.get(player.playerId) || 0;
      row.activeGames += isActiveWindow ? 1 : 0;
      row.activeScore += isActiveWindow ? gamePoints : 0;
      row.placeCounts[player.effectivePlace - 1] += 1;
      row.totalGames += 1;
      row.totalScore += gamePoints;
    });
  });

  const withStats: LeaderboardRow[] = Array.from(rows.values()).map((row) => {
    const status: LeaderboardStatus = row.activeGames >= activeGameMinimum ? "active" : "provisional";
    return {
      ...row,
      rank: null,
      score: row.totalScore,
      status,
    };
  });

  withStats
    .filter((row) => row.status === "active")
    .sort((a, b) => b.totalScore - a.totalScore || b.activeScore - a.activeScore || a.playerName.localeCompare(b.playerName))
    .forEach((row, index) => {
      row.rank = index + 1;
    });

  return withStats;
}

function PlacementChart({ playerId, points }: { playerId: string; points: PlacementPoint[] }) {
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const tooltipPoints = useMemo(() => points, [points]);

  useEffect(() => {
    let chart: ApexCharts | null = null;
    let alive = true;

    async function renderChart() {
      if (!chartRef.current || points.length === 0) {
        return;
      }

      const ApexCharts = (await import("apexcharts")).default;
      if (!alive || !chartRef.current) {
        return;
      }

      const options: ApexOptions = {
        chart: {
          events: {
            dataPointSelection: (_event, _chartContext, config) => {
              const point = config ? tooltipPoints[config.dataPointIndex] : null;
              if (point) {
                router.push(matchHref(point.match));
              }
            },
          },
          fontFamily: "inherit",
          height: 260,
          toolbar: { show: false },
          type: "line",
          zoom: { enabled: false },
        },
        colors: ["#5f4c00"],
        dataLabels: { enabled: false },
        grid: {
          borderColor: "#eee5be",
          strokeDashArray: 4,
        },
        markers: {
          colors: ["#fffdf3"],
          hover: { size: 7 },
          size: 5,
          strokeColors: "#5f4c00",
          strokeWidth: 2,
        },
        series: [
          {
            name: "Placement",
            data: points.map((point) => point.place),
          },
        ],
        stroke: {
          curve: "straight",
          width: 3,
        },
        tooltip: {
          custom: ({ dataPointIndex }) => {
            const point = tooltipPoints[dataPointIndex];
            if (!point) {
              return "";
            }
            const placements = seatedMatchPlayers(point.match)
              .map((player) => {
                const isCurrentPlayer = player.playerId === playerId;
                return `
                  <div class="flex items-center justify-between gap-6 ${isCurrentPlayer ? "font-bold text-[#25291f]" : "text-[#697061]"}">
                    <span>${placementLabel(player.effectivePlace)} - ${seatLabel(player.seatIndex)} ${player.playerName || player.playerId}</span>
                    <span>Score ${player.score}</span>
                  </div>
                `;
              })
              .join("");

            return `
              <div class="min-w-60 rounded-md border border-[#ded2a3] bg-white px-3 py-2 text-sm shadow-sm">
                <div class="font-semibold text-[#25291f]">${placementLabel(point.place)} place (${signedNumber(point.gamePoints)})</div>
                <div class="text-[#697061]">${gameTypeLabel(point.match.gameType)} - ${niceDate(point.match.gameTime)}</div>
                <div class="text-[#697061]">${signedNumber(point.gamePoints)}</div>
                <div class="text-[#697061]">Score after ${signedNumber(point.totalScore)}</div>
                <div class="mt-2 grid gap-1">${placements}</div>
              </div>
            `;
          },
          intersect: true,
          shared: false,
        },
        xaxis: {
          axisBorder: { show: false },
          axisTicks: { show: false },
          categories: points.map((_, index) => `${index + 1}`),
          labels: { show: false },
          tickPlacement: "on",
          tooltip: { enabled: false },
        },
        yaxis: {
          labels: {
            formatter: (value) => placementLabel(value),
            style: { colors: "#697061" },
          },
          max: 4,
          min: 1,
          reversed: true,
          tickAmount: 3,
        },
      };

      chart = new ApexCharts(chartRef.current, options);
      await chart.render();
    }

    renderChart();

    return () => {
      alive = false;
      chart?.destroy();
    };
  }, [playerId, points, router, tooltipPoints]);

  if (points.length === 0) {
    return <p className="text-sm text-[#697061]">No matches yet.</p>;
  }

  return <div className="min-h-[260px]" ref={chartRef} />;
}

export default function PlayerPage({ id }: PlayerPageProps) {
  const [state, setState] = useState<PlayerPageState>({
    allMatches: [],
    error: "",
    loading: true,
    matches: [],
    name: "",
    players: [],
    playerId: id,
  });

  useEffect(() => {
    let alive = true;

    Promise.all([loadYduckData(), loadMatchesByPlayer(id)])
      .then(([data, nextMatches]) => {
        if (!alive) {
          return;
        }
        setState({
          error: "",
          allMatches: data.matches,
          loading: false,
          matches: nextMatches,
          name: data.players.find((player) => player.id === id)?.name || "",
          players: data.players,
          playerId: id,
        });
      })
      .catch((err) => {
        if (alive) {
          setState({
            allMatches: [],
            error: err instanceof Error ? err.message : "Unable to load player.",
            loading: false,
            matches: [],
            name: "",
            players: [],
            playerId: id,
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const placementPoints = useMemo(() => {
    const records = [...state.matches]
      .sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime())
      .map((match) => {
        const result = getPlayerResult(match, id);
        if (!result) {
          return null;
        }

        return {
          gamePoints: calculateGamePoints(match).find((point) => point.playerId === id)?.gamePoints || 0,
          match,
          matchTime: new Date(match.gameTime),
          place: result.effectivePlace,
          score: result.score,
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

    return records.map((record, index) => {
      const totalScore = records.slice(0, index + 1).reduce((sum, point) => sum + point.gamePoints, 0);

      return {
        gamePoints: record.gamePoints,
        match: record.match,
        place: record.place,
        score: record.score,
        totalScore,
      };
    });
  }, [id, state.matches]);

  const leaderboardRow = useMemo(() => {
    return calculateLeaderboardRows(state.allMatches, state.players).find((row) => row.playerId === id) || null;
  }, [id, state.allMatches, state.players]);

  const loading = state.loading || state.playerId !== id;

  return (
    <AppShell>
      <section className="max-w-4xl space-y-4">
        <Link className="text-sm font-semibold text-[#5f4c00] underline decoration-[#b9aa70] underline-offset-4" href="/leaderboard">
          Back to leaderboard
        </Link>

        {loading && <p className="text-sm text-[#697061]">Loading player...</p>}
        {state.error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{state.error}</p>}

        <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold">{state.name || id}</h2>
          <p className="mt-1 text-sm text-[#697061]">{state.matches.length} matches</p>
          {leaderboardRow && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-xs font-semibold uppercase text-[#697061]">Rank</p>
                <p className="text-lg font-bold">{leaderboardRow.rank || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#697061]">Score</p>
                <p className="text-lg font-bold">{signedNumber(leaderboardRow.score)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#697061]">Status</p>
                <p className="text-lg font-bold">{statusLabel(leaderboardRow.status)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#697061]">Games</p>
                <p className="text-lg font-bold">{leaderboardRow.activeGames}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#697061]">Placements</p>
                <p className="text-sm font-semibold text-[#697061]">
                  {leaderboardRow.placeCounts
                    .map((count, index) => `${placementLabel(index + 1)} ${placePercent(count, leaderboardRow.totalGames)}`)
                    .join(" / ")}
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-xl font-bold">Placements over time</h3>
          </div>
          <PlacementChart playerId={id} points={placementPoints} />
        </article>
      </section>
    </AppShell>
  );
}
