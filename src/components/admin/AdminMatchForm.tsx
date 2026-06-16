"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AddMatchRequest, loadPlayers, Match, Player } from "@/services/yduckApiClient";

type Seat = {
  key: "east" | "south" | "west" | "north";
  label: string;
};

type MatchPlayerFormRow = {
  playerId: string;
  score: string;
};

type PlayerOption = {
  id: string;
  name: string;
};

export type MatchFormSubmitLabel = {
  idle: string;
  saving: string;
};

type AdminMatchFormProps = {
  initialMatch?: Match;
  heading: string;
  submitLabel: MatchFormSubmitLabel;
  savingErrorFallback: string;
  onSubmit: (request: AddMatchRequest) => Promise<void>;
};

const seats: Seat[] = [
  { key: "east", label: "East" },
  { key: "south", label: "South" },
  { key: "west", label: "West" },
  { key: "north", label: "North" },
];

const emptyRows = seats.map(() => ({ playerId: "", score: "" }));
const targetScoreTotal = 100000;

function todayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentHourValue() {
  return String(new Date().getHours()).padStart(2, "0");
}

function scoreValueIsInteger(value: string) {
  return /^-?\d+$/.test(value);
}

function editableScoreValue(value: string) {
  return /^-?\d*$/.test(value);
}

function gameTimeIso(dateValue: string, hourValue: string) {
  const [year, month, day] = dateValue.split("-").map((part) => Number(part));
  const hour = Number(hourValue);
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function dateValueFromIso(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hourValueFromIso(value: string) {
  return String(new Date(value).getHours()).padStart(2, "0");
}

function rowsFromMatch(match?: Match): MatchPlayerFormRow[] {
  if (!match) {
    return emptyRows;
  }

  return seats.map((_, index) => {
    const player = match.players[index];
    return {
      playerId: player?.playerId || "",
      score: player ? String(player.score) : "",
    };
  });
}

function playerOptionsForRow(players: Player[], match: Match | undefined, row: MatchPlayerFormRow) {
  const options: PlayerOption[] = players.map((player) => ({ id: player.id, name: player.name }));
  const selectedPlayerMissing = row.playerId && !options.some((player) => player.id === row.playerId);
  const matchPlayer = match?.players.find((player) => player.playerId === row.playerId);

  if (selectedPlayerMissing) {
    options.push({ id: row.playerId, name: matchPlayer?.playerName || row.playerId });
  }

  return options;
}

function adminErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function AdminMatchForm({ initialMatch, heading, submitLabel, savingErrorFallback, onSubmit }: AdminMatchFormProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState<MatchPlayerFormRow[]>(() => rowsFromMatch(initialMatch));
  const [gameType, setGameType] = useState<"east" | "south">(() => initialMatch?.gameType || "south");
  const [gameDate, setGameDate] = useState(() => (initialMatch ? dateValueFromIso(initialMatch.gameTime) : todayDateValue()));
  const [gameHour, setGameHour] = useState(() => (initialMatch ? hourValueFromIso(initialMatch.gameTime) : currentHourValue()));
  const [notes, setNotes] = useState(initialMatch?.notes || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let alive = true;

    loadPlayers()
      .then((next) => {
        if (alive) {
          setPlayers(next);
        }
      })
      .catch((err) => {
        if (alive) {
          setLoadError(err instanceof Error ? err.message : "Unable to load players.");
        }
      })
      .finally(() => {
        if (alive) {
          setLoadingPlayers(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedPlayerIds = useMemo(() => rows.map((row) => row.playerId).filter(Boolean), [rows]);
  const filledScores = useMemo(() => rows.filter((row) => scoreValueIsInteger(row.score)), [rows]);
  const scoreTotal = useMemo(() => filledScores.reduce((sum, row) => sum + Number(row.score), 0), [filledScores]);
  const showScoreWarning = filledScores.length === seats.length && scoreTotal !== targetScoreTotal;
  const allRowsComplete = rows.every((row) => row.playerId && scoreValueIsInteger(row.score));
  const canSubmit = allRowsComplete && Boolean(gameDate && gameHour) && !saving;

  function updateRow(index: number, nextRow: Partial<MatchPlayerFormRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...nextRow } : row)));
  }

  function handleScoreChange(index: number, value: string) {
    if (editableScoreValue(value)) {
      updateRow(index, { score: value });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const trimmedNotes = notes.trim();
      await onSubmit({
        gameTime: gameTimeIso(gameDate, gameHour),
        gameType,
        notes: trimmedNotes || undefined,
        players: rows.map((row) => ({
          playerId: row.playerId,
          score: Number(row.score),
        })),
      });
    } catch (err) {
      setSaveError(adminErrorMessage(err, savingErrorFallback));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">{heading}</h2>
      </div>

      {loadingPlayers && <p className="text-sm text-[#697061]">Loading players...</p>}
      {loadError && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{loadError}</p>}
      {saveError && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{saveError}</p>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-[#5f4c00]">Game type</legend>
              <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#ded2a3]">
                {(["east", "south"] as const).map((type) => (
                  <label
                    className={`flex h-11 cursor-pointer items-center justify-center text-sm font-bold ${
                      gameType === type ? "bg-[#8a261f] text-white" : "bg-[#fffdf3] text-[#1f2720] hover:bg-[#fff8d4]"
                    }`}
                    key={type}
                  >
                    <input
                      className="sr-only"
                      checked={gameType === type}
                      name="game-type"
                      type="radio"
                      value={type}
                      onChange={() => setGameType(type)}
                    />
                    {type === "east" ? "East" : "South"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#5f4c00]" htmlFor="match-date">
                Date
              </label>
              <input
                id="match-date"
                className="h-11 w-full rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
                type="date"
                value={gameDate}
                onChange={(event) => setGameDate(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#5f4c00]" htmlFor="match-hour">
                Hour
              </label>
              <select
                id="match-hour"
                className="h-11 w-full rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
                value={gameHour}
                onChange={(event) => setGameHour(event.target.value)}
              >
                {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {seats.map((seat, index) => {
            const row = rows[index];
            const playerOptions = playerOptionsForRow(players, initialMatch, row);

            return (
              <div className="grid gap-3 rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm md:grid-cols-[8rem_1fr_10rem]" key={seat.key}>
                <div className="text-sm font-bold text-[#5f4c00] md:pt-3">{seat.label}</div>
                <div>
                  <label className="sr-only" htmlFor={`match-player-${seat.key}`}>
                    {seat.label} player
                  </label>
                  <select
                    id={`match-player-${seat.key}`}
                    className="h-11 w-full rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
                    value={row.playerId}
                    onChange={(event) => updateRow(index, { playerId: event.target.value })}
                  >
                    <option value="">Select player</option>
                    {playerOptions.map((player) => {
                      const selectedByAnotherSeat = selectedPlayerIds.includes(player.id) && row.playerId !== player.id;

                      return (
                        <option disabled={selectedByAnotherSeat} key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`match-score-${seat.key}`}>
                    {seat.label} score
                  </label>
                  <input
                    id={`match-score-${seat.key}`}
                    className="h-11 w-full rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
                    inputMode="numeric"
                    placeholder="Score"
                    type="text"
                    value={row.score}
                    onChange={(event) => handleScoreChange(index, event.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-bold text-[#5f4c00]" htmlFor="match-notes">
            Notes
          </label>
          <textarea
            id="match-notes"
            className="min-h-28 w-full resize-y rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 py-2 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {showScoreWarning && (
          <p className="rounded-md border border-[#d6b85d] bg-[#fff8d4] p-3 text-sm font-semibold text-[#704e00]">
            Scores currently add up to {scoreTotal.toLocaleString()}, not {targetScoreTotal.toLocaleString()}.
          </p>
        )}

        <button
          className="h-11 rounded-md bg-[#8a261f] px-4 text-sm font-bold text-white hover:bg-[#6f1f1a] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit}
          type="submit"
        >
          {saving ? submitLabel.saving : submitLabel.idle}
        </button>
      </form>
    </section>
  );
}
