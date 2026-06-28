"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { calculateGamePointBreakdowns, GamePointBreakdown, leaderboardScoreBaseline } from "@/scoring/gamePoints";
import { loadMatch, loadYduckData, Match, Player } from "@/services/yduckApiClient";
import { gameTypeLabel, niceDate, roundedHourDate } from "@/utils/matchFormatting";
import { placedMatchPlayers, seatLabel } from "@/utils/matchPlayers";

type MatchPageProps = {
  id: string;
};

type LeaderboardStatus = "active" | "provisional";

type LeaderboardRow = {
  activeGames: number;
  activeScore: number;
  playerId: string;
  playerName: string;
  rank: number | null;
  score: number;
  status: LeaderboardStatus;
  totalGames: number;
  totalScore: number;
};

type MatchPageState = {
  allMatches: Match[];
  error: string;
  loading: boolean;
  match: Match | null;
  players: Player[];
};

const activeWindowMonths = 3;
const activeGameMinimum = 3;
const disgracedScoreGap = 670;

function playerHref(player: Match["players"][number]) {
  return `/player/${encodeURIComponent(player.playerId)}`;
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function placementLabel(place: number) {
  return `${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"}`;
}

function subtractMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() - months);
  return next;
}

function calculateMahjongSoulRows(matches: Match[], players: Player[], now = new Date()): LeaderboardRow[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const scoreBaseline = leaderboardScoreBaseline("mahjongSoulWithDisgracedOne");
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
    const matchPlayersById = new Map(match.players.map((player) => [player.playerId, player]));

    calculateGamePointBreakdowns(match, "mahjongSoulWithDisgracedOne").forEach((result) => {
      const matchPlayer = matchPlayersById.get(result.playerId);
      const row = ensureRow(result.playerId, matchPlayer?.playerName);
      row.totalGames += 1;
      row.totalScore += result.gamePoints;

      if (isActiveWindow) {
        row.activeGames += 1;
        row.activeScore += result.gamePoints;
      }
    });
  });

  const withStats: LeaderboardRow[] = Array.from(rows.values()).map((row) => ({
    ...row,
    rank: null,
    score: scoreBaseline + row.totalScore,
    status: row.activeGames >= activeGameMinimum ? "active" : "provisional",
  }));

  withStats
    .filter((row) => row.status === "active")
    .sort((a, b) => b.totalScore - a.totalScore || b.activeScore - a.activeScore || a.playerName.localeCompare(b.playerName))
    .forEach((row, index) => {
      row.rank = index + 1;
    });

  return withStats;
}

function findDisgracedOne(rows: LeaderboardRow[]) {
  const rankOne = rows.find((row) => row.rank === 1);
  const rankTwo = rows.find((row) => row.rank === 2);

  if (!rankOne || !rankTwo || rankOne.score - rankTwo.score < disgracedScoreGap) {
    return null;
  }

  return rankOne;
}

function disgracedMatchQuote(place: number) {
  if (place === 1) {
    return "The Devil proposed a childish contract: The last bullet would puncture the head of his beloved. The moment he heard that, he sought and shot all the people he loved.";
  }
  if (place === 2) {
    return "Just as the Devil said, the bullets will puncture anything you please. Forever.";
  }
  if (place === 3) {
    return "One day, the marksman realized the Devil no longer followed him. He pondered why, then realized that his soul had already fallen to Hell from the beginning.";
  }

  return "I came to a realization; perhaps the last bullet was meant to puncture no one else but me.";
}

function calculationText(breakdown: GamePointBreakdown) {
  const rankText = breakdown.rankPoints ? ` ${signedNumber(breakdown.rankPoints)} rank` : "";
  const adjustmentText = breakdown.adjustment ? ` ${signedNumber(breakdown.adjustment)} adj` : "";
  return `${signedNumber(breakdown.basePoints)} base ${signedNumber(breakdown.uma)} uma${rankText}${adjustmentText} = ${signedNumber(
    breakdown.gamePoints,
  )}`;
}

function calculationTitle(playerScore: number, breakdown: GamePointBreakdown) {
  const rankText = breakdown.rankPoints ? ` ${signedNumber(breakdown.rankPoints)} rank points` : "";
  const adjustmentText = breakdown.adjustment ? ` ${signedNumber(breakdown.adjustment)} table adjustment` : "";
  return `roundHalfDown((${playerScore} - ${breakdown.startingPoints}) / 1000) ${signedNumber(breakdown.uma)} uma${rankText}${adjustmentText} = ${signedNumber(
    breakdown.gamePoints,
  )}`;
}

export default function MatchPage({ id }: MatchPageProps) {
  const [state, setState] = useState<MatchPageState>({
    allMatches: [],
    error: "",
    loading: true,
    match: null,
    players: [],
  });

  useEffect(() => {
    let alive = true;

    Promise.all([loadMatch(id), loadYduckData()])
      .then(([nextMatch, data]) => {
        if (alive) {
          setState({
            allMatches: data.matches,
            error: "",
            loading: false,
            match: nextMatch,
            players: data.players,
          });
        }
      })
      .catch((err) => {
        if (alive) {
          setState({
            allMatches: [],
            error: err instanceof Error ? err.message : "Unable to load match.",
            loading: false,
            match: null,
            players: [],
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const match = state.match;
  const loading = state.loading;
  const error = state.error;
  const players = useMemo(() => (match ? placedMatchPlayers(match) : []), [match]);
  const disgracedOne = useMemo(
    () => findDisgracedOne(calculateMahjongSoulRows(state.allMatches, state.players)),
    [state.allMatches, state.players],
  );
  const matchIncludesDisgracedOne = Boolean(match && disgracedOne && match.players.some((player) => player.playerId === disgracedOne.playerId));
  const normalPointsByPlayer = useMemo(() => {
    return new Map((match ? calculateGamePointBreakdowns(match, "normal") : []).map((result) => [result.playerId, result]));
  }, [match]);
  const mahjongSoulPointsByPlayer = useMemo(() => {
    return new Map((match ? calculateGamePointBreakdowns(match, "mahjongSoulWithDisgracedOne") : []).map((result) => [result.playerId, result]));
  }, [match]);
  const mahjongSoulThreePlayerPointsByPlayer = useMemo(() => {
    if (!match || !matchIncludesDisgracedOne || !disgracedOne) {
      return new Map<string, GamePointBreakdown>();
    }

    return new Map(
      calculateGamePointBreakdowns(match, "mahjongSoul", { excludedPlayerIds: [disgracedOne.playerId] }).map((result) => [
        result.playerId,
        result,
      ]),
    );
  }, [disgracedOne, match, matchIncludesDisgracedOne]);

  return (
    <AppShell>
      <section className="max-w-3xl space-y-4">
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
                const normalBreakdown = normalPointsByPlayer.get(player.playerId);
                const mahjongSoulBreakdown = mahjongSoulPointsByPlayer.get(player.playerId);
                const mahjongSoulThreePlayerBreakdown = mahjongSoulThreePlayerPointsByPlayer.get(player.playerId);
                const isDisgracedOne = matchIncludesDisgracedOne && disgracedOne?.playerId === player.playerId;

                return (
                  <div className="rounded-md border border-[#eee5be] bg-[#fffdf3] p-3" key={`${match.id}-${player.playerId}`}>
                    <p className="font-semibold">
                      {placementLabel(player.effectivePlace)} -{" "}
                      <Link className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]" href={playerHref(player)}>
                        {player.playerName || player.playerId}
                      </Link>{" "}
                      - {seatLabel(player.seatIndex)}
                    </p>
                    <p className="text-sm text-[#697061]">Score {player.score}</p>
                    <div className="mt-2 grid gap-1">
                      {normalBreakdown && (
                        <p
                          className="text-sm font-semibold text-[#5f4c00] underline decoration-dotted decoration-[#b9aa70] underline-offset-4"
                          title={calculationTitle(player.score, normalBreakdown)}
                        >
                          Normal: {calculationText(normalBreakdown)}
                        </p>
                      )}
                      {mahjongSoulBreakdown && (
                        <p
                          className="text-sm font-semibold text-[#2b6095] underline decoration-dotted decoration-[#9bb7d0] underline-offset-4"
                          title={calculationTitle(player.score, mahjongSoulBreakdown)}
                        >
                          Mahjong Soul: {calculationText(mahjongSoulBreakdown)}
                        </p>
                      )}
                      {mahjongSoulThreePlayerBreakdown && (
                        <p
                          className="text-sm font-semibold text-[#24765d] underline decoration-dotted decoration-[#93c7b5] underline-offset-4"
                          title={calculationTitle(player.score, mahjongSoulThreePlayerBreakdown)}
                        >
                          Mahjong Soul 3P: {calculationText(mahjongSoulThreePlayerBreakdown)}
                        </p>
                      )}
                      {isDisgracedOne && (
                        <p className="text-sm font-semibold text-[#5f4c00]">&quot;{disgracedMatchQuote(player.effectivePlace)}&quot;</p>
                      )}
                    </div>
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
