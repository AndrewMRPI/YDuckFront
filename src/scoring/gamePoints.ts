import type { Match } from "@/services/yduckApiClient";
import { rankedMatchPlayers } from "@/utils/matchPlayers";

export type GamePointResult = {
  playerId: string;
  gamePoints: number;
};

export type ScoringMode = "normal" | "mahjongSoul";

export type GamePointBreakdown = GamePointResult & {
  adjustment: number;
  basePoints: number;
  effectivePlace: number;
  rankPoints: number;
  score: number;
  scoringMode: ScoringMode;
  startingPoints: number;
  uma: number;
};

export const scoringModes: { label: string; value: ScoringMode }[] = [
  { label: "Mahjong Soul", value: "mahjongSoul" },
  { label: "Normal", value: "normal" },
];

export const leaderboardStartingScore = 1500;

export function leaderboardScoreBaseline(scoringMode: ScoringMode) {
  return scoringMode === "mahjongSoul" ? leaderboardStartingScore : 0;
}

const fourPlayerStartingPoints = 25000;
const threePlayerStartingPoints = 35000;
const fourPlayerUma = [15, 5, -5, -15];
const threePlayerUma = [15, 0, -15];
const mahjongSoulRankPoints = {
  3: {
    east: [60, 0, -60],
    south: [120, 0, -120],
  },
  4: {
    east: [40, 20, 0, -60],
    south: [80, 40, 0, -120],
  },
};

function roundHalfDown(value: number) {
  const roundedMagnitude = Math.floor(Math.abs(value) + 0.5 - Number.EPSILON);
  return Math.sign(value) * roundedMagnitude;
}

function pointsConfig(playerCount: number) {
  if (playerCount === 3) {
    return { startingPoints: threePlayerStartingPoints, uma: threePlayerUma };
  }

  return { startingPoints: fourPlayerStartingPoints, uma: fourPlayerUma };
}

function normalizedGameType(match: Match) {
  const normalized = match.gameType?.trim().toLowerCase();
  return normalized === "south" ? "south" : "east";
}

function rankPointsForMatch(match: Match, effectivePlace: number, playerCount: number, scoringMode: ScoringMode) {
  if (scoringMode !== "mahjongSoul" || (playerCount !== 3 && playerCount !== 4)) {
    return 0;
  }

  return mahjongSoulRankPoints[playerCount][normalizedGameType(match)][effectivePlace - 1] || 0;
}

export function calculateGamePoints(match: Match, scoringMode: ScoringMode = "normal"): GamePointResult[] {
  return calculateGamePointBreakdowns(match, scoringMode).map(({ playerId, gamePoints }) => ({ playerId, gamePoints }));
}

export function calculateGamePointBreakdowns(match: Match, scoringMode: ScoringMode = "normal"): GamePointBreakdown[] {
  const players = rankedMatchPlayers(match);
  const { startingPoints, uma } = pointsConfig(players.length);
  const results = players.map((player) => {
    const basePoints = roundHalfDown((player.score - startingPoints) / 1000);
    const placementUma = uma[player.effectivePlace - 1] || 0;
    const rankPoints = rankPointsForMatch(match, player.effectivePlace, players.length, scoringMode);

    return {
      adjustment: 0,
      basePoints,
      effectivePlace: player.effectivePlace,
      gamePoints: basePoints + placementUma + rankPoints,
      playerId: player.playerId,
      rankPoints,
      score: player.score,
      scoringMode,
      startingPoints,
      uma: placementUma,
    };
  });
  const adjustment = results.reduce((sum, result) => sum + result.gamePoints, 0);
  const winner = results.find((result) => players.find((player) => player.playerId === result.playerId)?.effectivePlace === 1);

  // Keep each match table-neutral after per-player rounding.
  if (winner && adjustment !== 0) {
    winner.gamePoints -= adjustment;
    winner.adjustment = -adjustment;
  }

  return results;
}
