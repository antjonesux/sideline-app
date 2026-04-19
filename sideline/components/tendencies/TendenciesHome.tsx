"use client";

import { AmIPredictable } from "@/components/tendencies/AmIPredictable";
import { WhatsWorking } from "@/components/tendencies/WhatsWorking";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { playbookForGame } from "@/lib/tendenciesServer";
import type { GameSession } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Tab = "working" | "predictable";

const tabs: { id: Tab; label: string }[] = [
  { id: "working", label: "What's Working" },
  { id: "predictable", label: "Am I Predictable?" },
];

export function TendenciesHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const playbookParam = searchParams.get("playbook")?.trim() || null;

  const setPlaybookInUrl = useCallback(
    (next: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next?.trim()) sp.set("playbook", next.trim());
      else sp.delete("playbook");
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [tab, setTab] = useState<Tab>("working");

  const gamesQuery = useQuery({
    queryKey: ["games", "list"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      if (!res.ok) return [] as GameSession[];
      const j: unknown = await res.json();
      return Array.isArray(j) ? (j as GameSession[]) : [];
    },
    staleTime: 60 * 1000,
  });

  const playbooksQuery = useQuery({
    queryKey: tendenciesQueryKeys.playbooksList(),
    queryFn: async () => {
      const res = await fetch("/api/playbooks/list");
      if (!res.ok) throw new Error("playbooks list");
      return res.json() as Promise<{ playbooks: string[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const games = Array.isArray(gamesQuery.data) ? gamesQuery.data : [];
  const playbookOptions = Array.isArray(playbooksQuery.data?.playbooks) ? playbooksQuery.data.playbooks : [];

  const opponents = useMemo(() => {
    const s = new Set<string>();
    for (const g of games) {
      const playbook = playbookForGame({
        offensive_playbook: g.offensive_playbook ?? null,
        my_playbook: g.my_playbook ?? null,
      });
      if (!playbook.trim()) continue;
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
      <section className="space-y-6">
        <h1 className="app-page-title text-slate-100">Tendencies</h1>
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-8 text-center sm:px-8">
          <p className="font-sans text-base font-medium text-white">No games logged yet.</p>
          <p className="mt-2 font-sans text-sm text-slate-500">Log some games to see your tendencies.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/film/new" className="btn-primary px-5 py-3 text-sm">
              Log your first game
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
    <section className="space-y-6">
      <h1 className="app-page-title text-slate-100">Tendencies</h1>

      <div className="border-b border-slate-800">
        <nav className="grid w-full grid-cols-2" aria-label="Tendencies views">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-center text-sm font-sans font-medium transition-colors ${
                  active ? "border-emerald-500 text-white" : "border-transparent text-slate-400"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div key={tab} className="tab-content">
        {tab === "working" ? (
          <WhatsWorking
            opponents={opponents}
            playbook={playbookParam}
            onPlaybookChange={setPlaybookInUrl}
            playbookOptions={playbookOptions}
            playbookLoading={playbooksQuery.isLoading}
          />
        ) : null}
        {tab === "predictable" ? (
          <AmIPredictable
            opponents={opponents}
            playbook={playbookParam}
            onPlaybookChange={setPlaybookInUrl}
            playbookOptions={playbookOptions}
            playbookLoading={playbooksQuery.isLoading}
          />
        ) : null}
      </div>
    </section>
  );
}
