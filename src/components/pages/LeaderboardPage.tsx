"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadYduckData, Match, Player, YduckData } from "@/services/yduckApiClient";
import { calculateGamePoints, leaderboardScoreBaseline, scoringModes, ScoringMode } from "@/scoring/gamePoints";
import { gameTypeLabel, niceDate } from "@/utils/matchFormatting";
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

type ChartPlayer = Pick<LeaderboardRow, "playerId" | "playerName" | "score" | "status" | "totalGames"> & {
  color: string;
};

type ChartPoint = {
  gamePoints: number;
  match: Match;
  matchIndex: number;
  place: number;
  totalScore: number;
  x: number;
  y: number;
};

type ChartSegment = {
  carry: boolean;
  d: string;
};

type ChartSeries = {
  gapMarkers: { x: number; y: number }[];
  player: ChartPlayer;
  points: ChartPoint[];
  segments: ChartSegment[];
};

type HoverPoint = {
  point: ChartPoint;
  player: ChartPlayer;
};

const activeWindowMonths = 3;
const activeGameMinimum = 3;
const chartWidth = 920;
const chartHeight = 360;
const chartPadding = { bottom: 48, left: 56, right: 24, top: 22 };
const playerColors = ["#24765d", "#2b6095", "#a43b31", "#6e4ca2", "#b05f18", "#137789", "#8a6d1d", "#656b70"];

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function scoreNumber(value: number) {
  return `${value}`;
}

function leaderboardScoreText(value: number, scoringMode: ScoringMode) {
  return scoringMode === "normal" ? signedNumber(value) : scoreNumber(value);
}

function averageScore(row: LeaderboardRow) {
  if (row.totalGames === 0) {
    return "-";
  }

  return signedNumber(Math.round(row.totalScore / row.totalGames));
}

function statusLabel(row: LeaderboardRow) {
  if (row.status === "active") {
    return "Gamer";
  }
  return "Provisional";
}

function matchHref(match: Match) {
  return `/match/${encodeURIComponent(match.id)}`;
}

function placementLabel(place: number) {
  return `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
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

function calculateLeaderboardRows(matches: Match[], players: Player[], scoringMode: ScoringMode, now = new Date()): LeaderboardRow[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const scoreBaseline = leaderboardScoreBaseline(scoringMode);
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
    const gamePointsByPlayer = new Map(calculateGamePoints(match, scoringMode).map((result) => [result.playerId, result.gamePoints]));

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
    const score = scoreBaseline + row.totalScore;

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
    .sort((a, b) => b.totalScore - a.totalScore || b.activeScore - a.activeScore || a.playerName.localeCompare(b.playerName));

  activeRows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return withStats.sort((a, b) => {
    const statusOrder = { active: 0, provisional: 1 };
    return (
      statusOrder[a.status] - statusOrder[b.status] ||
      b.totalScore - a.totalScore ||
      b.totalGames - a.totalGames ||
      a.playerName.localeCompare(b.playerName)
    );
  });
}

function chartTicks(minValue: number, maxValue: number) {
  const spread = Math.max(1, maxValue - minValue);
  const roughStep = spread / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const start = Math.floor(minValue / step) * step;
  const end = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];

  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Object.is(value, -0) ? 0 : value);
  }

  return ticks.length > 1 ? ticks : [start, start + step];
}

function matchSortValue(match: Match) {
  const time = new Date(match.gameTime).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function ScoreOverTimeChart({ matches, rows, scoringMode }: { matches: Match[]; rows: LeaderboardRow[]; scoringMode: ScoringMode }) {
  const router = useRouter();
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<string>>(new Set());
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const scoreBaseline = leaderboardScoreBaseline(scoringMode);
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => matchSortValue(a) - matchSortValue(b) || a.id.localeCompare(b.id)),
    [matches],
  );
  const chartPlayers = useMemo(
    () =>
      rows
        .filter((row) => row.totalGames > 0)
        .map((row, index) => ({
          playerId: row.playerId,
          playerName: row.playerName,
          score: row.score,
          status: row.status,
          totalGames: row.totalGames,
          color: playerColors[index % playerColors.length],
        })),
    [rows],
  );
  const playerById = useMemo(() => new Map(chartPlayers.map((player) => [player.playerId, player])), [chartPlayers]);
  const scale = useMemo(() => {
    const totals = new Map<string, number>();
    const values = [scoreBaseline];

    sortedMatches.forEach((match) => {
      calculateGamePoints(match, scoringMode).forEach((result) => {
        if (!playerById.has(result.playerId)) {
          return;
        }
        const nextTotal = (totals.get(result.playerId) ?? scoreBaseline) + result.gamePoints;
        totals.set(result.playerId, nextTotal);
        values.push(nextTotal);
      });
    });

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const ticks = chartTicks(minValue, maxValue);
    const minTick = ticks[0];
    const maxTick = ticks[ticks.length - 1];
    const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
    const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const xForMatch = (index: number) =>
      sortedMatches.length <= 1
        ? chartPadding.left + plotWidth / 2
        : chartPadding.left + (index / (sortedMatches.length - 1)) * plotWidth;
    const yForScore = (score: number) =>
      chartPadding.top + ((maxTick - score) / Math.max(1, maxTick - minTick)) * plotHeight;

    return { maxTick, minTick, ticks, xForMatch, yForScore };
  }, [playerById, scoreBaseline, scoringMode, sortedMatches]);
  const series = useMemo<ChartSeries[]>(() => {
    const totals = new Map<string, number>();
    const nextSeries = new Map<string, ChartSeries>();

    chartPlayers.forEach((player) => {
      nextSeries.set(player.playerId, {
        gapMarkers: [],
        player,
        points: [],
        segments: [],
      });
    });

    sortedMatches.forEach((match, matchIndex) => {
      const gamePointsByPlayer = new Map(calculateGamePoints(match, scoringMode).map((result) => [result.playerId, result.gamePoints]));
      const placeByPlayer = new Map(rankedMatchPlayers(match).map((player) => [player.playerId, player.effectivePlace]));

      chartPlayers.forEach((player) => {
        const playerSeries = nextSeries.get(player.playerId);
        if (!playerSeries) {
          return;
        }

        const previousPoint = playerSeries.points[playerSeries.points.length - 1];
        const x = scale.xForMatch(matchIndex);
        const gamePoints = gamePointsByPlayer.get(player.playerId);

        if (typeof gamePoints === "number") {
          const totalScore = (totals.get(player.playerId) ?? scoreBaseline) + gamePoints;
          totals.set(player.playerId, totalScore);
          const nextPoint = {
            gamePoints,
            match,
            matchIndex,
            place: placeByPlayer.get(player.playerId) || 0,
            totalScore,
            x,
            y: scale.yForScore(totalScore),
          };

          if (previousPoint) {
            playerSeries.segments.push({
              carry: false,
              d: `M ${previousPoint.x} ${previousPoint.y} L ${nextPoint.x} ${nextPoint.y}`,
            });
          }
          playerSeries.points.push(nextPoint);
          return;
        }

        if (previousPoint) {
          const carryPoint = {
            ...previousPoint,
            match,
            matchIndex,
            x,
          };
          playerSeries.segments.push({
            carry: true,
            d: `M ${previousPoint.x} ${previousPoint.y} L ${carryPoint.x} ${carryPoint.y}`,
          });
          playerSeries.gapMarkers.push({ x: carryPoint.x, y: carryPoint.y });
          playerSeries.points.push(carryPoint);
        }
      });
    });

    return Array.from(nextSeries.values()).filter((playerSeries) => playerSeries.points.length > 0);
  }, [chartPlayers, scale, scoreBaseline, scoringMode, sortedMatches]);
  const xLabels = useMemo(() => {
    if (sortedMatches.length === 0) {
      return [];
    }

    return [0, Math.floor((sortedMatches.length - 1) / 2), sortedMatches.length - 1].filter(
      (index, position, indexes) => indexes.indexOf(index) === position,
    );
  }, [sortedMatches]);

  function togglePlayer(playerId: string) {
    setHiddenPlayerIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }

  function showAllPlayers() {
    setHiddenPlayerIds(new Set());
  }

  function hideAllPlayers() {
    setHiddenPlayerIds(new Set(chartPlayers.map((player) => player.playerId)));
  }

  if (chartPlayers.length === 0 || sortedMatches.length === 0) {
    return null;
  }

  return (
    <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold">Score over time</h3>
          <p className="text-sm text-[#697061]">Flat dashed stretches mean the player did not play that match.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-sm text-[#697061]">Click a player label to hide it. Click a point to open the match.</p>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-md border border-[#ded2a3] bg-white px-3 text-sm font-semibold hover:bg-[#fff8d4] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={hiddenPlayerIds.size === 0}
              onClick={showAllPlayers}
              type="button"
            >
              Show all
            </button>
            <button
              className="h-9 rounded-md border border-[#ded2a3] bg-white px-3 text-sm font-semibold hover:bg-[#fff8d4] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={hiddenPlayerIds.size === chartPlayers.length}
              onClick={hideAllPlayers}
              type="button"
            >
              Hide all
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-md border border-[#eee5be] bg-[#fffdf3]">
        <svg
          className="block min-w-[760px]"
          height={chartHeight}
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Leaderboard score over time</title>
          <desc>Cumulative game points for each player, with carried flat line segments for matches they missed.</desc>
          <rect fill="#fffdf3" height={chartHeight} width={chartWidth} x="0" y="0" />
          {scale.ticks.map((tick) => {
            const y = scale.yForScore(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  stroke={tick === 0 ? "#b9aa70" : "#eee5be"}
                  strokeDasharray={tick === 0 ? "5 5" : undefined}
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#697061" fontSize="12" textAnchor="end" x={chartPadding.left - 10} y={y + 4}>
                  {leaderboardScoreText(tick, scoringMode)}
                </text>
              </g>
            );
          })}
          <line
            stroke="#b9aa70"
            x1={chartPadding.left}
            x2={chartPadding.left}
            y1={chartPadding.top}
            y2={chartHeight - chartPadding.bottom}
          />
          <line
            stroke="#b9aa70"
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={chartHeight - chartPadding.bottom}
            y2={chartHeight - chartPadding.bottom}
          />
          {xLabels.map((matchIndex) => (
            <text
              fill="#697061"
              fontSize="12"
              key={`x-label-${matchIndex}`}
              textAnchor={matchIndex === 0 ? "start" : matchIndex === sortedMatches.length - 1 ? "end" : "middle"}
              x={scale.xForMatch(matchIndex)}
              y={chartHeight - 18}
            >
              {matchIndex === sortedMatches.length - 1 ? "Latest" : `Match ${matchIndex + 1}`}
            </text>
          ))}
          {series.map((playerSeries) => {
            const isHidden = hiddenPlayerIds.has(playerSeries.player.playerId);
            return (
              <g
                aria-hidden={isHidden}
                key={playerSeries.player.playerId}
                opacity={isHidden ? 0 : 1}
                pointerEvents={isHidden ? "none" : "auto"}
              >
                {playerSeries.segments.map((segment, index) => (
                  <path
                    d={segment.d}
                    fill="none"
                    key={`${playerSeries.player.playerId}-segment-${index}`}
                    opacity={segment.carry ? 0.28 : playerSeries.player.status === "provisional" ? 0.72 : 1}
                    stroke={playerSeries.player.color}
                    strokeDasharray={segment.carry ? "4 9" : playerSeries.player.status === "provisional" ? "7 7" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={segment.carry ? 2 : 3}
                  />
                ))}
                {playerSeries.gapMarkers.map((gap, index) => (
                  <line
                    key={`${playerSeries.player.playerId}-gap-${index}`}
                    opacity="0.42"
                    stroke={playerSeries.player.color}
                    strokeLinecap="round"
                    strokeWidth="2"
                    x1={gap.x}
                    x2={gap.x}
                    y1={gap.y - 5}
                    y2={gap.y + 5}
                  />
                ))}
                {playerSeries.points
                  .filter((point, index, points) => index === 0 || points[index - 1].match.id !== point.match.id || points[index - 1].totalScore !== point.totalScore)
                  .map((point) => {
                    const played = point.match.players.some((matchPlayer) => matchPlayer.playerId === playerSeries.player.playerId);
                    if (!played) {
                      return null;
                    }

                    return (
                      <circle
                        aria-label={`${playerSeries.player.playerName}, ${leaderboardScoreText(point.totalScore, scoringMode)} after ${niceDate(
                          point.match.gameTime,
                        )}`}
                        className="cursor-pointer outline-none"
                        cx={point.x}
                        cy={point.y}
                        fill="#fffdf3"
                        key={`${playerSeries.player.playerId}-${point.match.id}`}
                        onBlur={() => setHoverPoint(null)}
                        onClick={() => router.push(matchHref(point.match))}
                        onFocus={() => setHoverPoint({ player: playerSeries.player, point })}
                        onMouseEnter={() => setHoverPoint({ player: playerSeries.player, point })}
                        onMouseLeave={() => setHoverPoint(null)}
                        r="5"
                        role="button"
                        stroke={playerSeries.player.color}
                        strokeWidth="2"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(matchHref(point.match));
                          }
                        }}
                      />
                    );
                  })}
              </g>
            );
          })}
        </svg>
        {hoverPoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-56 rounded-md border border-[#ded2a3] bg-white px-3 py-2 text-sm shadow-sm"
            style={{
              left: `${Math.min(chartWidth - 128, Math.max(128, hoverPoint.point.x))}px`,
              top: `${Math.max(16, hoverPoint.point.y - 14)}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-bold text-[#25291f]">{hoverPoint.player.playerName}</p>
            <p className="text-[#697061]">
              {gameTypeLabel(hoverPoint.point.match.gameType)} - {niceDate(hoverPoint.point.match.gameTime)}
            </p>
            <p className="text-[#697061]">
              {placementLabel(hoverPoint.point.place)} place, {signedNumber(hoverPoint.point.gamePoints)}
            </p>
            <p className="font-semibold text-[#25291f]">Score after {leaderboardScoreText(hoverPoint.point.totalScore, scoringMode)}</p>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {chartPlayers.map((player) => {
          const isHidden = hiddenPlayerIds.has(player.playerId);
          return (
            <button
              aria-pressed={isHidden}
              className={`flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left text-sm font-semibold hover:border-[#ded2a3] ${
                isHidden ? "text-[#969b91]" : "text-[#25291f]"
              }`}
              key={player.playerId}
              onClick={() => togglePlayer(player.playerId)}
              type="button"
            >
              <span
                className="h-1 w-6 rounded-full"
                style={{
                  backgroundColor: player.status === "provisional" ? "transparent" : player.color,
                  borderTop: player.status === "provisional" ? `4px dotted ${player.color}` : undefined,
                }}
              />
              <span className={isHidden ? "line-through" : ""}>
                {player.playerName} {leaderboardScoreText(player.score, scoringMode)}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<YduckData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("mahjongSoul");

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

  const rows = useMemo(() => calculateLeaderboardRows(data?.matches || [], data?.players || [], scoringMode), [data, scoringMode]);
  const hasActiveRows = rows.some((row) => row.status === "active");

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-sm text-[#697061]">Scores use total game points from all matches.</p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-[#ded2a3] bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-[#25291f]">Scoring mode</p>
          <div className="flex rounded-md border border-[#ded2a3] bg-[#fffdf3] p-1">
            {scoringModes.map((mode) => {
              const active = scoringMode === mode.value;
              return (
                <button
                  className={`h-9 rounded px-3 text-sm font-semibold ${
                    active ? "bg-[#1f2720] text-white" : "text-[#25291f] hover:bg-[#fff8d4]"
                  }`}
                  key={mode.value}
                  onClick={() => setScoringMode(mode.value)}
                  type="button"
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
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
                  <th className="px-4 py-3 font-bold">Avg</th>
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
                    <td className="px-4 py-3 font-bold">{leaderboardScoreText(row.score, scoringMode)}</td>
                    <td className="px-4 py-3 font-bold">{averageScore(row)}</td>
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

        {!loading && !error && data && rows.length > 0 && (
          <ScoreOverTimeChart matches={data.matches} rows={rows} scoringMode={scoringMode} />
        )}
      </section>
    </AppShell>
  );
}
