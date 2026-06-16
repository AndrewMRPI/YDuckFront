"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadYduckData } from "@/services/yduckApiClient";

type PlayerPageProps = {
  id: string;
};

export default function PlayerPage({ id }: PlayerPageProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;

    loadYduckData()
      .then((data) => {
        if (!alive) {
          return;
        }
        setName(data.players.find((player) => player.id === id)?.name || "");
      })
      .catch(() => {
        if (alive) {
          setName("");
        }
      });

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <AppShell>
      <section className="max-w-2xl">
        <article className="rounded-lg border border-[#ded2a3] bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold">{name}</h2>
        </article>
      </section>
    </AppShell>
  );
}
