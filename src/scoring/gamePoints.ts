import type { Match } from "@/services/yduckApiClient";

export type GamePointResult = {
  playerId: string;
  gamePoints: number;
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
  const { startingPoints, uma } = pointsConfig(match.players.length);
  const results = match.players.map((player) => ({
    playerId: player.playerId,
    gamePoints: roundHalfDown((player.score - startingPoints) / 1000) + (uma[player.place - 1] || 0),
  }));
  const adjustment = results.reduce((sum, result) => sum + result.gamePoints, 0);
  const winner = results.find((result) => match.players.find((player) => player.playerId === result.playerId)?.place === 1);

  // Keep each match table-neutral after per-player rounding.
  if (winner && adjustment !== 0) {
    winner.gamePoints -= adjustment;
  }

  return results;
}
