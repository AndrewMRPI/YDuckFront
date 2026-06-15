"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  CachedYduckData,
  clearCachedData,
  loadYduckData,
  Match,
  Player,
  readStoredSession,
} from "../lib/yduck-client";

function niceDate(value?: string) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleString();
}

function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes > 0 ? `${minutes} min` : `${seconds} sec`;
}

function useYduckData() {
  const [data, setData] = useState<CachedYduckData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload(force = false) {
    setLoading(true);
    setError("");
    try {
      const next = await loadYduckData(force);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return { data, error, loading, reload };
}

export function MatchList() {
  const { data, error, loading, reload } = useYduckData();
  const isAdmin = readStoredSession().role === "admin";
  const playerIds = useMemo(() => new Set(data?.players.map((player) => player.id) || []), [data]);

  async function deleteMatch(id: string) {
    await apiRequest<void>(`/api/matches/${id}`, { method: "DELETE" });
    clearCachedData();
    await reload(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Home</h2>
        <button
          className="h-10 rounded-md border border-[#b9aa70] bg-white px-4 text-sm font-semibold hover:border-[#1f2720]"
          type="button"
          onClick={() => reload(true)}
        >
          Refresh
        </button>
      </div>
      {loading && <p className="text-sm text-[#697061]">Loading matches...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      <div className="grid gap-3">
        {data?.matches.map((match) => {
          const missingUser = match.players.some((player) => !playerIds.has(player.playerId));
          return (
            <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm" key={match.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#697061]">{niceDate(match.gameTime || match.createdAt)}</p>
                  <h3 className="text-xl font-bold">{durationLabel(match.durationSeconds)}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-md px-3 py-1 text-sm font-semibold ${
                      missingUser ? "bg-[#ffe2d8] text-[#8a261f]" : "bg-[#e2f0dd] text-[#2c6b35]"
                    }`}
                  >
                    {missingUser ? "Missing user" : "Users linked"}
                  </span>
                  {isAdmin && (
                    <button
                      className="rounded-md border border-[#c98a80] px-3 py-1 text-sm font-semibold text-[#8a261f] hover:bg-[#fff3f0]"
                      type="button"
                      onClick={() => deleteMatch(match.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[...match.players]
                  .sort((a, b) => a.place - b.place)
                  .map((player) => (
                    <div className="rounded-md border border-[#eee5be] bg-[#fffdf3] p-3" key={`${match.id}-${player.playerId}`}>
                      <p className="font-semibold">
                        {player.place}. {player.playerName || player.playerId}
                      </p>
                      <p className="text-sm text-[#697061]">Score {player.score}</p>
                    </div>
                  ))}
              </div>
              {match.notes && <p className="mt-3 text-sm text-[#555d52]">{match.notes}</p>}
            </article>
          );
        })}
      </div>
      {!loading && data?.matches.length === 0 && <p className="text-sm text-[#697061]">No matches yet.</p>}
    </section>
  );
}

export function PlayerList() {
  const { data, error, loading, reload } = useYduckData();
  const isAdmin = readStoredSession().role === "admin";

  async function deletePlayer(id: string) {
    await apiRequest<void>(`/api/players/${id}`, { method: "DELETE" });
    clearCachedData();
    await reload(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">List Player</h2>
        <button
          className="h-10 rounded-md border border-[#b9aa70] bg-white px-4 text-sm font-semibold hover:border-[#1f2720]"
          type="button"
          onClick={() => reload(true)}
        >
          Refresh
        </button>
      </div>
      {loading && <p className="text-sm text-[#697061]">Loading players...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.players.map((player) => (
          <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm" key={player.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{player.name}</h3>
                <p className="break-all text-sm text-[#697061]">{player.id}</p>
              </div>
              {isAdmin && (
                <button
                  className="rounded-md border border-[#c98a80] px-3 py-1 text-sm font-semibold text-[#8a261f] hover:bg-[#fff3f0]"
                  type="button"
                  onClick={() => deletePlayer(player.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!loading && data?.players.length === 0 && <p className="text-sm text-[#697061]">No players yet.</p>}
    </section>
  );
}

export function AddUserForm() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    try {
      await apiRequest<{ player: Player }>("/api/players", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      clearCachedData();
      setName("");
      setStatus("User added.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to add user.");
    }
  }

  return (
    <section className="max-w-xl space-y-4">
      <h2 className="text-2xl font-bold">Add User</h2>
      <form className="space-y-3" onSubmit={submit}>
        <input
          className="h-12 w-full rounded-md border border-[#b9aa70] bg-white px-4 outline-none focus:border-[#1f2720]"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="h-11 rounded-md bg-[#1f2720] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!name.trim()}
          type="submit"
        >
          Add
        </button>
      </form>
      {status && <p className="text-sm text-[#555d52]">{status}</p>}
    </section>
  );
}

export function AddMatchForm() {
  const { data, error, loading } = useYduckData();
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [gameTime, setGameTime] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState([
    { playerId: "", score: "0", place: "1" },
    { playerId: "", score: "0", place: "2" },
    { playerId: "", score: "0", place: "3" },
    { playerId: "", score: "0", place: "4" },
  ]);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    try {
      await apiRequest<{ match: Match }>("/api/matches", {
        method: "POST",
        body: JSON.stringify({
          players: rows.map((row) => ({
            playerId: row.playerId,
            score: Number(row.score),
            place: Number(row.place),
          })),
          durationSeconds: Number(durationMinutes) * 60,
          gameTime: gameTime ? new Date(gameTime).toISOString() : undefined,
          notes,
        }),
      });
      clearCachedData();
      setStatus("Match added.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to add match.");
    }
  }

  function updateRow(index: number, field: "playerId" | "score" | "place", value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  return (
    <section className="max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold">Add Match</h2>
      {loading && <p className="text-sm text-[#697061]">Loading players...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-12 rounded-md border border-[#b9aa70] bg-white px-4 outline-none focus:border-[#1f2720]"
            min="1"
            type="number"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
          <input
            className="h-12 rounded-md border border-[#b9aa70] bg-white px-4 outline-none focus:border-[#1f2720]"
            type="datetime-local"
            value={gameTime}
            onChange={(event) => setGameTime(event.target.value)}
          />
        </div>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div className="grid gap-3 rounded-lg border border-[#ded2a3] bg-white p-3 sm:grid-cols-[1fr_110px_110px]" key={index}>
              <select
                className="h-11 rounded-md border border-[#b9aa70] bg-white px-3 outline-none focus:border-[#1f2720]"
                value={row.playerId}
                onChange={(event) => updateRow(index, "playerId", event.target.value)}
              >
                <option value=""></option>
                {data?.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <input
                className="h-11 rounded-md border border-[#b9aa70] bg-white px-3 outline-none focus:border-[#1f2720]"
                type="number"
                value={row.score}
                onChange={(event) => updateRow(index, "score", event.target.value)}
              />
              <select
                className="h-11 rounded-md border border-[#b9aa70] bg-white px-3 outline-none focus:border-[#1f2720]"
                value={row.place}
                onChange={(event) => updateRow(index, "place", event.target.value)}
              >
                {[1, 2, 3, 4].map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <textarea
          className="min-h-28 w-full rounded-md border border-[#b9aa70] bg-white px-4 py-3 outline-none focus:border-[#1f2720]"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <button className="h-11 rounded-md bg-[#1f2720] px-4 font-semibold text-white" type="submit">
          Add
        </button>
      </form>
      {status && <p className="text-sm text-[#555d52]">{status}</p>}
    </section>
  );
}
