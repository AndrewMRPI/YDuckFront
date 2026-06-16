import type { Match } from "@/services/yduckApiClient";

export type RankedMatchPlayer = Match["players"][number] & {
  effectivePlace: number;
  seatIndex: number;
};

const seatNames = ["East", "South", "West", "North"];

export function seatLabel(seatIndex: number) {
  return seatNames[seatIndex] || "Seat";
}

export function rankedMatchPlayers(match: Match): RankedMatchPlayer[] {
  return match.players
    .map((player, seatIndex) => ({ ...player, seatIndex }))
    .sort((a, b) => b.score - a.score || a.seatIndex - b.seatIndex)
    .map((player, index) => ({ ...player, effectivePlace: index + 1 }));
}

export function seatedMatchPlayers(match: Match): RankedMatchPlayer[] {
  const placementByPlayerId = new Map(rankedMatchPlayers(match).map((player) => [player.playerId, player.effectivePlace]));
  return match.players.map((player, seatIndex) => ({
    ...player,
    effectivePlace: placementByPlayerId.get(player.playerId) || seatIndex + 1,
    seatIndex,
  }));
}
