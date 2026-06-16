"use client";

import { useEffect, useState } from "react";
import { loadYduckData, YduckData } from "@/services/yduckApiClient";

export function useYduckData() {
  const [data, setData] = useState<YduckData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const next = await loadYduckData();
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
