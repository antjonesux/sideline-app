"use client";

import { AmIPredictable } from "@/components/tendencies/AmIPredictable";
import { GameFilm } from "@/components/tendencies/GameFilm";
import { WhatsWorking } from "@/components/tendencies/WhatsWorking";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import type { GameSession } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

type Tab = "working" | "predictable" | "film";

const tabs: { id: Tab; label: string }[] = [
  { id: "working", label: "What's Working" },
  { id: "predictable", label: "Am I Predictable?" },
  { id: "film", label: "Game Film" },
];

export function TendenciesHome() {
  const [tab, setTab] = useState<Tab>("working");

  const gamesQuery = useQuery({
    queryKey: ["games", "list"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      if (!res.ok) return [] as GameSession[];
      return res.json() as Promise<GameSession[]>;
    },
    staleTime: 60 * 1000,
  });

  const games = gamesQuery.data ?? [];
  const opponents = useMemo(() => {
    const s = new Set<string>();
    for (const g of games) {
      const o = (g.opponent_team ?? "").trim();
      if (o) s.add(o);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [games]);

  if (gamesQuery.isLoading) {
    return <FilmRoomSkeleton />;
  }

  if (games.length === 0) {
    return (
      <section className="space-y-6 pb-16">
        <h1 className="app-page-title text-slate-100">Tendencies</h1>
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-8 text-center sm:px-8">
          <p className="font-body text-base font-medium text-white">No game data yet.</p>
          <p className="mt-2 font-body text-sm text-slate-500">
            Log plays during a game or import from CSV to start seeing your tendencies.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/film/new" className="btn-primary px-5 py-3 text-sm">
              + New Game
            </Link>
            <Link href="/film/import" className="btn-secondary px-5 py-3 text-sm">
              Import from CSV
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <h1 className="app-page-title text-slate-100">Tendencies</h1>

      <div className="border-b border-slate-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tendencies views">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`font-body shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "border-emerald-500 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === "working" ? <WhatsWorking opponents={opponents} /> : null}
      {tab === "predictable" ? <AmIPredictable opponents={opponents} /> : null}
      {tab === "film" ? <GameFilm games={games} /> : null}
    </section>
  );
}
