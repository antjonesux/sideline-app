"use client";

import { AdjustedCallSheet } from "@/components/AdjustedCallSheet";
import { DefensiveSchemeCard } from "@/components/DefensiveSchemeCard";
import { FormationExploitPanel } from "@/components/FormationExploitPanel";
import { GamePlanModeToggle } from "@/components/GamePlanModeToggle";
import { InGameCallSheet } from "@/components/InGameCallSheet";
import { InGameSheet } from "@/components/InGameSheet";
import { SituationQuickNav } from "@/components/SituationQuickNav";
import { fetchGamePlanBundle } from "@/lib/fetchGamePlan";
import { playSheetPlayToDraft } from "@/lib/mapPlayToDraft";
import type {
  DraftPlayRow,
  PlaySheetListItem,
  PlaySheetWithPlays,
} from "@/lib/playSheetTypes";
import { playbookFromSchemeField } from "@/lib/resolvePlaybook";
import type { Scheme } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function GamePlanPageClient({ schemeId }: { schemeId: string }) {
  const setActiveSchemeId = useGameStore((s) => s.setActiveSchemeId);
  const selectedDefensiveScheme = useGameStore((s) => s.selectedDefensiveScheme);
  const selectedOpponentTeam = useGameStore((s) => s.selectedOpponentTeam);
  const gameMode = useGameStore((s) => s.gameMode);
  const screenshotMode = useGameStore((s) => s.screenshotMode);
  const activeSituationKey = useGameStore((s) => s.activeSituationKey);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setScreenshotMode = useGameStore((s) => s.setScreenshotMode);
  const setActiveSituationKey = useGameStore((s) => s.setActiveSituationKey);
  const activePlaySheetId = useGameStore((s) => s.activePlaySheetId);
  const setActivePlaySheetId = useGameStore((s) => s.setActivePlaySheetId);
  const gamePlanInGameTab = useGameStore((s) => s.gamePlanInGameTab);
  const setGamePlanInGameTab = useGameStore((s) => s.setGamePlanInGameTab);

  const [sheetRows, setSheetRows] = useState<DraftPlayRow[]>([]);

  useEffect(() => {
    setActiveSchemeId(schemeId);
  }, [schemeId, setActiveSchemeId]);

  const { data, isPending, isError } = useQuery({
    queryKey: ["gameplan", schemeId, selectedDefensiveScheme],
    queryFn: () =>
      fetchGamePlanBundle(schemeId, selectedDefensiveScheme as string),
    enabled: Boolean(schemeId && selectedDefensiveScheme),
    staleTime: 30 * 60_000,
  });

  const { data: schemeMeta } = useQuery({
    queryKey: ["scheme-meta", schemeId],
    queryFn: async () => {
      const res = await fetch(`/api/schemes/${schemeId}`);
      if (!res.ok) return null;
      return (await res.json()) as Scheme;
    },
    enabled: Boolean(schemeId),
    staleTime: 30 * 60_000,
  });

  const playbook = useMemo(
    () => playbookFromSchemeField(schemeMeta?.cfb26_playbook),
    [schemeMeta?.cfb26_playbook],
  );

  const { data: activeSheet } = useQuery({
    queryKey: ["playsheet", activePlaySheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playsheets/${activePlaySheetId}`);
      if (!res.ok) return null;
      return (await res.json()) as PlaySheetWithPlays;
    },
    enabled: Boolean(activePlaySheetId),
    staleTime: 60_000,
  });

  const { data: sheetList = [] } = useQuery({
    queryKey: ["playsheets-pick", schemeId],
    queryFn: async () => {
      const q = new URLSearchParams({ offensive_scheme_id: schemeId });
      const res = await fetch(`/api/playsheets?${q}`);
      if (!res.ok) return [];
      return (await res.json()) as PlaySheetListItem[];
    },
    enabled: Boolean(schemeId),
  });

  const matchingSheets = useMemo(
    () =>
      sheetList.filter(
        (s) => s.defensive_scheme === selectedDefensiveScheme,
      ),
    [sheetList, selectedDefensiveScheme],
  );

  useEffect(() => {
    if (!activePlaySheetId) {
      setSheetRows([]);
      return;
    }
    if (activeSheet?.plays) {
      setSheetRows(activeSheet.plays.map((p) => playSheetPlayToDraft(p)));
    }
  }, [activeSheet, activePlaySheetId]);

  if (!selectedDefensiveScheme) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Select an opponent (team or defensive scheme) from your scheme
          dashboard first.
        </p>
        <Link
          href={`/scheme/${schemeId}`}
          className="mt-4 inline-block font-mono text-sm text-[var(--accent-soft)]"
        >
          ← Back to scheme
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Loading game plan…
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          No curated game plan for this matchup yet. Try Arbuckle Air Raid vs
          4-2-5 after seeding Supabase, or pick another defense once data exists.
        </p>
        <Link
          href={`/scheme/${schemeId}`}
          className="mt-4 inline-block font-mono text-sm text-[var(--accent-soft)]"
        >
          ← Back to scheme
        </Link>
      </div>
    );
  }

  const chipLabel = selectedOpponentTeam
    ? `${selectedOpponentTeam} → ${selectedDefensiveScheme}`
    : selectedDefensiveScheme;

  if (gameMode === "ingame") {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        {!screenshotMode ? (
          <div className="fixed right-3 top-3 z-30 flex max-w-[min(100vw-1.5rem,220px)] flex-col items-end gap-2">
            <GamePlanModeToggle mode={gameMode} onChange={setGameMode} />
            <div className="flex w-full flex-col gap-1 rounded border border-white/15 bg-black/60 p-1 font-mono text-[10px] uppercase tracking-wider backdrop-blur">
              <button
                type="button"
                onClick={() => setGamePlanInGameTab("calls")}
                className={`rounded px-2 py-1.5 text-left ${
                  gamePlanInGameTab === "calls"
                    ? "bg-[var(--amber)]/20 text-[var(--chalk)]"
                    : "text-[var(--chalk-muted)]"
                }`}
              >
                Call sheet
              </button>
              <button
                type="button"
                onClick={() => setGamePlanInGameTab("mysheet")}
                className={`rounded px-2 py-1.5 text-left ${
                  gamePlanInGameTab === "mysheet"
                    ? "bg-[var(--amber)]/20 text-[var(--chalk)]"
                    : "text-[var(--chalk-muted)]"
                }`}
              >
                My sheet
              </button>
            </div>
            <Link
              href={`/scheme/${schemeId}`}
              className="rounded border border-white/15 bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--accent-soft)] backdrop-blur"
            >
              ← Scheme
            </Link>
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl">
          <SituationQuickNav
            activeSituation={activeSituationKey}
            onSelect={setActiveSituationKey}
          />
          {gamePlanInGameTab === "calls" ? (
            <InGameCallSheet
              calls={data.adjustedCalls}
              activeSituation={activeSituationKey}
              onSelectSituation={setActiveSituationKey}
            />
          ) : activePlaySheetId ? (
            <InGameSheet
              rows={sheetRows}
              activeSituation={activeSituationKey}
              sheetId={activePlaySheetId}
              defensiveScheme={selectedDefensiveScheme}
              playbook={playbook}
              onRowsChange={setSheetRows}
            />
          ) : (
            <div className="space-y-3 px-4 py-8">
              <p className="font-mono text-sm text-[var(--chalk-muted)]">
                Choose a saved play sheet for this matchup (or build one from
                Pre-Game).
              </p>
              {matchingSheets.length === 0 ? (
                <Link
                  href={`/scheme/${schemeId}/playsheet/new`}
                  className="inline-block font-mono text-sm text-[var(--accent-soft)]"
                >
                  Build play sheet →
                </Link>
              ) : (
                <ul className="space-y-2">
                  {matchingSheets.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActivePlaySheetId(s.id)}
                        className="w-full rounded-lg border border-white/15 bg-black/35 px-4 py-3 text-left font-mono text-sm text-[var(--chalk)] hover:border-[var(--amber)]/40"
                      >
                        {s.name}
                        <span className="mt-1 block text-[10px] text-[var(--chalk-muted)]">
                          {s.play_count} plays
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/playsheets"
                className="block font-mono text-xs text-[var(--accent-soft)]"
              >
                All sheets →
              </Link>
            </div>
          )}
        </div>
        {screenshotMode ? (
          <button
            type="button"
            onClick={() => setScreenshotMode(false)}
            className="fixed bottom-4 right-4 z-50 rounded border border-white/20 bg-black/80 px-3 py-2 font-mono text-xs text-[var(--chalk)]"
          >
            Exit screenshot
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header
        className={
          screenshotMode
            ? "sr-only"
            : "border-b border-white/10 bg-black/30 px-4 py-6 md:px-10"
        }
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/scheme/${schemeId}`}
              className="font-mono text-xs text-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              ← Scheme dashboard
            </Link>
            <h1 className="mt-3 font-display text-3xl tracking-wide text-[var(--chalk)] md:text-4xl">
              Game Plan
            </h1>
            <p className="mt-2 font-mono text-sm text-[var(--chalk-muted)]">
              vs <span className="text-[var(--accent-soft)]">{chipLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GamePlanModeToggle mode={gameMode} onChange={setGameMode} />
            <Link
              href={`/scheme/${schemeId}/playsheet/new`}
              className="rounded border border-[var(--accent)]/45 bg-[var(--accent)]/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--accent-soft)] hover:border-[var(--accent)]"
            >
              Build play sheet
            </Link>
            <Link
              href="/playsheets"
              className="rounded border border-white/15 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--chalk-muted)] hover:border-white/25"
            >
              Sheet library
            </Link>
            <button
              type="button"
              onClick={() => setScreenshotMode(!screenshotMode)}
              className={`rounded border px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${
                screenshotMode
                  ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber-soft)]"
                  : "border-white/15 text-[var(--chalk-muted)] hover:border-white/25"
              }`}
            >
              {screenshotMode ? "Exit screenshot" : "Screenshot mode"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 md:space-y-12 md:px-10">
        <DefensiveSchemeCard
          profile={data.defensiveProfile}
          vulnerabilitySummary={data.gamePlan.vulnerability_summary}
        />
        <FormationExploitPanel exploits={data.formationExploits} />
        <AdjustedCallSheet
          calls={data.adjustedCalls}
          defensiveSchemeName={data.gamePlan.defensive_scheme}
        />
      </main>

      {screenshotMode ? (
        <button
          type="button"
          onClick={() => setScreenshotMode(false)}
          className="fixed bottom-4 right-4 z-50 rounded border border-white/20 bg-black/80 px-3 py-2 font-mono text-xs text-[var(--chalk)]"
        >
          Exit screenshot
        </button>
      ) : null}
    </div>
  );
}
