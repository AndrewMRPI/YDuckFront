"use client";

import { useState } from "react";
import { MatchHistoryView } from "@/components/match-history/MatchHistoryView";
import { useYduckData } from "@/components/match-history/useYduckData";
import { Match } from "@/services/yduckApiClient";
import { deleteMatch } from "@/services/yduckAdminApiClient";

export function AdminMatchHistory() {
  const { data, error, loading, reload } = useYduckData();
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(match: Match) {
    setDeletingMatchId(match.id);
    setDeleteError("");
    try {
      await deleteMatch(match.id);
      await reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete match.");
    } finally {
      setDeletingMatchId("");
    }
  }

  return (
    <MatchHistoryView
      action={(match) => {
        const deleting = deletingMatchId === match.id;

        return (
          <button
            className="h-10 rounded-md border border-[#b33a2f] bg-white px-3 text-sm font-bold text-[#8a261f] hover:bg-[#fff3f0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleting}
            type="button"
            onClick={() => handleDelete(match)}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        );
      }}
      actionError={deleteError}
      data={data}
      error={error}
      loading={loading}
    />
  );
}
