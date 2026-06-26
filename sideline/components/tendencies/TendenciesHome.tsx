"use client";

import { AmIPredictable } from "@/components/tendencies/AmIPredictable";
import { WhatsWorking } from "@/components/tendencies/WhatsWorking";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { isOnboardingGameSession } from "@/lib/onboardingImportSource";
import { playbookForGame } from "@/lib/tendenciesServer";
import type { GameSession } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emitProductEvent } from "@/lib/productAnalytics";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "working" | "predictable";

const tabs: { id: Tab; label: string }[] = [
  { id: "working", label: "What's Working" },
  { id: "predictable", label: "Am I Predictable?" },
];

const tendenciesSubTabTriggerClass =
  "flex min-h-12 w-full items-center justify-center rounded-none border-b-2 border-transparent bg-transparent px-2 text-center text-sm font-sans font-medium text-slate-400 shadow-none ring-offset-transparent transition-colors data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

export function TendenciesHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    emitProductEvent("tendencies_viewed", { path: `${pathname}` }, { dedupeKey: "tendencies", dedupeWindowMs: 2000 });
  }, [pathname]);
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

  const games = (Array.isArray(gamesQuery.data) ? gamesQuery.data : []).filter((g) => !isOnboardingGameSession(g));
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
        <AppShellMenuHeader title="Tendencies" titleClassName="text-slate-100" />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 flex min-h-[320px] flex-col items-center justify-center py-8 text-center sm:px-8">
          <p className="font-sans text-base font-medium text-white">No games logged yet.</p>
          <p className="mt-2 font-sans text-sm text-slate-500">Log some games to see your tendencies.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="default" className="px-5 py-3 text-sm">
              <Link href="/film/new">Log your first game</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <AppShellMenuHeader title="Tendencies" titleClassName="text-slate-100" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <TabsList
          aria-label="Tendencies views"
          className="grid h-auto w-full grid-cols-2 gap-0 rounded-none border-b border-slate-800 bg-transparent p-0 text-muted-foreground"
        >
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className={tendenciesSubTabTriggerClass}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="pt-3">
          <TabsContent value="working" className="mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
            {tab === "working" ? (
              <WhatsWorking
                opponents={opponents}
                playbook={playbookParam}
                onPlaybookChange={setPlaybookInUrl}
                playbookOptions={playbookOptions}
                playbookLoading={playbooksQuery.isLoading}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="predictable" className="mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
            {tab === "predictable" ? (
              <AmIPredictable
                opponents={opponents}
                playbook={playbookParam}
                onPlaybookChange={setPlaybookInUrl}
                playbookOptions={playbookOptions}
                playbookLoading={playbooksQuery.isLoading}
              />
            ) : null}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
