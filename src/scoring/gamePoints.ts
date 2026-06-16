import type { Match } from "@/services/yduckApiClient";
import { rankedMatchPlayers } from "@/utils/matchPlayers";

export type GamePointResult = {
  playerId: string;
  gamePoints: number;
};

export type GamePointBreakdown = GamePointResult & {
  adjustment: number;
  basePoints: number;
  effectivePlace: number;
  score: number;
  startingPoints: number;
  uma: number;
};

const fourPlayerStartingPoints = 25000;
const threePlayerStartingPoints = 35000;
const fourPlayerUma = [15, 5, -5, -15];
const threePlayerUma = [15, 0, -15];

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

export function calculateGamePoints(match: Match): GamePointResult[] {
  return calculateGamePointBreakdowns(match).map(({ playerId, gamePoints }) => ({ playerId, gamePoints }));
}

export function calculateGamePointBreakdowns(match: Match): GamePointBreakdown[] {
  const players = rankedMatchPlayers(match);
  const { startingPoints, uma } = pointsConfig(players.length);
  const results = players.map((player) => ({
    adjustment: 0,
    basePoints: roundHalfDown((player.score - startingPoints) / 1000),
    effectivePlace: player.effectivePlace,
    gamePoints: roundHalfDown((player.score - startingPoints) / 1000) + (uma[player.effectivePlace - 1] || 0),
    playerId: player.playerId,
    score: player.score,
    startingPoints,
    uma: uma[player.effectivePlace - 1] || 0,
  }));
  const adjustment = results.reduce((sum, result) => sum + result.gamePoints, 0);
  const winner = results.find((result) => players.find((player) => player.playerId === result.playerId)?.effectivePlace === 1);

  // Keep each match table-neutral after per-player rounding.
  if (winner && adjustment !== 0) {
    winner.gamePoints -= adjustment;
    winner.adjustment = -adjustment;
  }

  return results;
}
