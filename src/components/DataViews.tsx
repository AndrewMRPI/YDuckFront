"use client";

import { MatchHistoryView } from "@/components/match-history/MatchHistoryView";
import { useYduckData } from "@/components/match-history/useYduckData";

export function MatchList() {
  const { data, error, loading } = useYduckData();

  return <MatchHistoryView data={data} error={error} loading={loading} />;
}
