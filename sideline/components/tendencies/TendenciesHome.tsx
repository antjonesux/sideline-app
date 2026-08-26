"use client";

import { AmIPredictable } from "@/components/tendencies/AmIPredictable";
import { MyTendenciesHeroStats } from "@/components/tendencies/MyTendenciesHeroStats";
import { TendenciesSideOfBallToggle } from "@/components/tendencies/TendenciesSideOfBallToggle";
import { WhatsWorking } from "@/components/tendencies/WhatsWorking";
import { buildTendenciesQueryString } from "@/components/tendencies/TendenciesFilters";
import { TendenciesHomeSkeleton } from "@/components/shared/PageSkeleton";
import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import {
  APP_SHELL_MY_TENDENCIES_MENU_LABEL,
  TENDENCIES_NO_DEFENSIVE_PLAYS,
} from "@/lib/coachCopy";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { isOnboardingGameSession } from "@/lib/onboardingImportSource";
import { playbookForGame } from "@/lib/tendenciesServer";
import type { DriveSideOfBall, GameSession } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

type OverviewResponse = { data: { games_logged: number } };

export function TendenciesHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sideOfBall, setSideOfBall] = useState<DriveSideOfBall>("offense");
  const [tab, setTab] = useState<Tab>("working");

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

  const overviewQs = useMemo(
    () =>
      buildTendenciesQueryString({
        pill: "all",
        opponentTeam: null,
        minUses: 1,
        playbook: playbookParam,
        sideOfBall,
      }),
    [playbookParam, sideOfBall],
  );

  const overviewQuery = useQuery({
    queryKey: tendenciesQueryKeys.overview(overviewQs),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/overview?${overviewQs}`);
      if (!res.ok) throw new Error("overview");
      return res.json() as Promise<OverviewResponse>;
    },
    staleTime: 60 * 1000,
    enabled: sideOfBall === "defense",
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

  const defenseEmpty =
    sideOfBall === "defense" &&
    !overviewQuery.isLoading &&
    !overviewQuery.isError &&
    (overviewQuery.data?.data.games_logged ?? 0) === 0;

  if (gamesQuery.isLoading) {
    return <TendenciesHomeSkeleton />;
  }

  if (games.length === 0) {
    return (
      <section className="space-y-6">
        <header className="flex items-center gap-4">
          <CallSheetMenuButton className="md:hidden" onClick={() => setMenuOpen(true)} />
          <h1 className="min-w-0 flex-1 font-heading text-3xl font-bold uppercase tracking-[0.12em] text-slate-100">
            {APP_SHELL_MY_TENDENCIES_MENU_LABEL}
          </h1>
        </header>
        <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
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
      <header className="space-y-2">
        <div className="flex items-center gap-4">
          <CallSheetMenuButton className="md:hidden" onClick={() => setMenuOpen(true)} />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.12em] text-slate-100">
              {APP_SHELL_MY_TENDENCIES_MENU_LABEL}
            </h1>
            <p className="font-body text-sm text-slate-400">
              What kind of play caller are you becoming? — {games.length} games logged
            </p>
          </div>
        </div>
      </header>
      <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />

      <TendenciesSideOfBallToggle value={sideOfBall} onChange={setSideOfBall} />

      {defenseEmpty ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 py-10 text-center">
          <p className="font-body text-sm text-slate-300">{TENDENCIES_NO_DEFENSIVE_PLAYS}</p>
        </div>
      ) : (
        <>
          <MyTendenciesHeroStats sideOfBall={sideOfBall} playbook={playbookParam} />

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
                    sideOfBall={sideOfBall}
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
                    sideOfBall={sideOfBall}
                  />
                ) : null}
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </section>
  );
}
