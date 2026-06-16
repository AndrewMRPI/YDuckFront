"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { addPlayer, deletePlayer } from "@/services/yduckAdminApiClient";
import { loadPlayers, Player } from "@/services/yduckApiClient";

function formatPlayerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function adminErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message === "player_has_matches") {
    return "That player has matches and cannot be deleted until those matches are removed.";
  }
  return message || "Unable to update players.";
}

export function AdminPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const next = await loadPlayers();
      setPlayers(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load players.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      await addPlayer(trimmedName);
      setName("");
      await reload();
    } catch (err) {
      setActionError(adminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(player: Player) {
    setDeletingPlayerId(player.id);
    setActionError("");
    try {
      await deletePlayer(player.id);
      await reload();
    } catch (err) {
      setActionError(adminErrorMessage(err));
    } finally {
      setDeletingPlayerId("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Modify Players</h2>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm sm:flex-row" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor="new-player-name">
          Player name
        </label>
        <input
          id="new-player-name"
          className="h-11 min-w-0 flex-1 rounded-md border border-[#ded2a3] bg-[#fffdf3] px-3 text-sm outline-none focus:border-[#8a261f] focus:ring-2 focus:ring-[#8a261f]/15"
          autoComplete="off"
          placeholder="New player name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="h-11 rounded-md bg-[#8a261f] px-4 text-sm font-bold text-white hover:bg-[#6f1f1a] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || name.trim().length === 0}
          type="submit"
        >
          {saving ? "Adding..." : "Add Player"}
        </button>
      </form>

      {loading && <p className="text-sm text-[#697061]">Loading players...</p>}
      {error && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{error}</p>}
      {actionError && <p className="rounded-md border border-[#d99494] bg-[#fff3f0] p-3 text-sm text-[#8a261f]">{actionError}</p>}

      <div className="overflow-x-auto rounded-lg border border-[#ded2a3] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#ded2a3] bg-[#fff8d4] text-[#5f4c00]">
            <tr>
              <th className="px-4 py-3 font-bold">Player</th>
              <th className="px-4 py-3 font-bold">Created</th>
              <th className="px-4 py-3 font-bold">Updated</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const deleting = deletingPlayerId === player.id;

              return (
                <tr className="border-b border-[#eee5be] last:border-0" key={player.id}>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      className="underline decoration-[#b9aa70] underline-offset-4 hover:text-[#5f4c00]"
                      href={`/player/${encodeURIComponent(player.id)}`}
                    >
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#697061]">{formatPlayerDate(player.createdAt)}</td>
                  <td className="px-4 py-3 text-[#697061]">{formatPlayerDate(player.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="h-9 rounded-md border border-[#b33a2f] bg-white px-3 text-sm font-bold text-[#8a261f] hover:bg-[#fff3f0] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleting}
                      type="button"
                      onClick={() => handleDelete(player)}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && players.length === 0 && <p className="text-sm text-[#697061]">No players yet.</p>}
    </section>
  );
}
