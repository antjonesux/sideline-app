"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { scenarioDisplayLabel, scenarioMaxSlots, sortScenariosByCanonicalOrder } from "@/lib/playbookUtils";
import { appShellPageTitleClass, modalCtaFooterClass, overlayZ } from "@/lib/constants/designTokens";
import { cn, normalizePlayName } from "@/lib/utils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import {
  COULDNT_SAVE,
  GUIDED_ONBOARDING_EDITOR_SCENARIO,
  ONBOARDING_GAME_READY,
  ONBOARDING_OPPONENT_SCHEME,
  ONBOARDING_OPPONENT_TEAM,
  ONBOARDING_START_LOGS,
} from "@/lib/coachCopy";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
import { useScrollLock } from "@/lib/useScrollLock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddPlayDrawer } from "./AddPlayDrawer";
import { PlaySlot } from "./PlaySlot";
import { PlaySuggestions } from "./PlaySuggestions";
import { SituationList } from "./SituationList";

const STALE_SCENARIO_MS = 5 * 60 * 1000;

type SheetPayload = {
  id: string;
  name: string;
  playbook: string;
  cfb26_playbook?: string | null;
  scheme: string;
  cfb26_display?: string;
  scenarios: SheetScenarioBlock[];
};

type ScenarioPayload = {
  scenarioId: string;
  scenario: string;
  plays: SheetPlayRow[];
  scenarioStats: Record<string, { uses: number; avg_yards: number; success_rate: number }>;
  formationStats: Record<string, { uses: number; success_rate: number }>;
  suggestions: SuggestionRow[];
};

type SetupApi = {
  offensiveTeams: { team_name: string; playbook_name: string; scheme_style: string }[];
};

const MIN_ONBOARDING_SHEET_PLAYS = 3;

export function PlaybookEditor({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboardingEditor = searchParams.get("onboarding") === "1";
  const setLastGame = useLastGamePrefsStore((s) => s.setLastGame);
  const queryClient = useQueryClient();
  const [activeScenario, setActiveScenario] = useState("1st Down");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [replaceSuggest, setReplaceSuggest] = useState<SuggestionRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPlaybook, setEditPlaybook] = useState("");
  const [startGuidedBusy, setStartGuidedBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  useScrollLock(editorOpen);

  const sheetQuery = useQuery({
    queryKey: ["playbook", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playbook/${sheetId}`);
      const j = (await res.json()) as SheetPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load play sheet");
      return j;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const scenarioQuery = useQuery({
    queryKey: ["playbook-scenario", sheetId, activeScenario],
    queryFn: async () => {
      const q = new URLSearchParams({ scenario: activeScenario });
      const res = await fetch(`/api/playbook/${sheetId}/plays?${q.toString()}`);
      const j = (await res.json()) as ScenarioPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load scenario");
      return j;
    },
    staleTime: STALE_SCENARIO_MS,
    enabled: Boolean(sheetId) && Boolean(activeScenario),
  });
  const setupQuery = useQuery({
    queryKey: ["film-setup"],
    queryFn: async () => {
      const res = await fetch("/api/film/setup");
      if (!res.ok) throw new Error("Failed to load CFB26 playbooks");
      return res.json() as Promise<SetupApi>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const sheet = sheetQuery.data;
  const scenarios = useMemo(
    () => sortScenariosByCanonicalOrder(sheet?.scenarios ?? []),
    [sheet?.scenarios],
  );

  const totalSheetPlays = useMemo(
    () => scenarios.reduce((acc, s) => acc + (s.plays?.length ?? 0), 0),
    [scenarios],
  );
  const scenarioPayload = scenarioQuery.data;

  useEffect(() => {
    if (!scenarios.length) return;
    if (onboardingEditor) {
      const pick =
        scenarios.find((s) => s.scenario === GUIDED_ONBOARDING_EDITOR_SCENARIO)?.scenario ??
        scenarios[0]?.scenario ??
        "1st Down";
      setActiveScenario(pick);
      return;
    }
    if (!scenarios.some((s) => s.scenario === activeScenario)) {
      setActiveScenario(scenarios[0]?.scenario ?? "1st Down");
    }
  }, [scenarios, activeScenario, onboardingEditor]);

  useEffect(() => {
    setDrawerOpen(false);
    setReplaceSuggest(null);
  }, [activeScenario]);

  const activeBlock = useMemo(
    () => scenarios.find((s) => s.scenario === activeScenario),
    [scenarios, activeScenario],
  );

  const sortedPlays = useMemo(() => {
    const plays = activeBlock?.plays ?? [];
    return [...plays].sort((a, b) => a.play_order - b.play_order);
  }, [activeBlock?.plays]);

  const maxSlots = scenarioMaxSlots(activeScenario);
  const filled = sortedPlays.length;
  const atCapacity = filled >= maxSlots;

  const cfb26PlaybookOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of setupQuery.data?.offensiveTeams ?? []) {
      if (row.playbook_name?.trim()) set.add(row.playbook_name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [setupQuery.data?.offensiveTeams]);
  const cfb26 = useMemo(() => {
    if (!sheet) return "";
    const optionByLower = new Map<string, string>();
    for (const option of cfb26PlaybookOptions) {
      optionByLower.set(option.toLowerCase(), option);
    }
    const explicitCfb26 = (sheet.cfb26_playbook ?? "").trim();
    if (explicitCfb26) {
      return optionByLower.get(explicitCfb26.toLowerCase()) ?? explicitCfb26;
    }
    const legacyValue = (sheet.playbook ?? "").trim();
    if (!legacyValue) return "";
    // If setup options are unavailable, do not over-block legacy rows; let PlayBrowser fetch and surface catalog errors.
    if (optionByLower.size === 0) return legacyValue;
    // Legacy rows can store a display label in `playbook`; pass through only when it maps to a known catalog entry.
    return optionByLower.get(legacyValue.toLowerCase()) ?? "";
  }, [sheet, cfb26PlaybookOptions]);

  const invalidateScenario = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId, activeScenario] });
    void queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
    void queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
  }, [queryClient, sheetId, activeScenario]);

  const postPlay = useMutation({
    mutationFn: async (body: { scenarioId: string; formation: string; play_name: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not add play");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const deletePlay = useMutation({
    mutationFn: async (playId: string) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays?playId=${encodeURIComponent(playId)}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not remove");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const reorderPlays = useMutation({
    mutationFn: async (payload: { scenarioId: string; orderedPlayIds: string[] }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", ...payload }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not reorder");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const swapPlay = useMutation({
    mutationFn: async (body: { playId: string; formation: string; play_name: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "swap", ...body }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not replace play");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const updateSheet = useMutation({
    mutationFn: async (body: { name: string; cfb26_playbook: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not update play sheet");
      return j;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
      await queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId] });
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
    },
  });

  const onReorder = useCallback(
    (fromId: string, toSlotIndex: number) => {
      const sid = activeBlock?.id;
      if (!sid) return;
      const ids = sortedPlays.map((p) => p.id);
      const without = ids.filter((id) => id !== fromId);
      const insertAt = Math.min(Math.max(0, toSlotIndex), without.length);
      const next = [...without.slice(0, insertAt), fromId, ...without.slice(insertAt)];
      reorderPlays.mutate({ scenarioId: sid, orderedPlayIds: next });
    },
    [sortedPlays, reorderPlays, activeBlock?.id],
  );

  const openAdd = useCallback(() => {
    if (atCapacity) {
      addToast(`Situation full (${maxSlots}/${maxSlots} slots).`, "warning");
      return;
    }
    setDrawerOpen(true);
  }, [addToast, atCapacity, maxSlots]);

  const onDrawerPick = useCallback(
    async (formation: string, play_name: string) => {
      try {
        const sid = activeBlock?.id;
        if (!sid) {
          addToast(COULDNT_SAVE, "error");
          return;
        }
        await postPlay.mutateAsync({ scenarioId: sid, formation, play_name });
        addToast("Added to sheet.", "success");
      } catch (e) {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setDrawerOpen(false);
      }
    },
    [activeBlock?.id, postPlay, addToast],
  );

  const onSuggestAdd = useCallback(
    async (s: SuggestionRow) => {
      if (atCapacity) {
        setReplaceSuggest(s);
        return;
      }
      const sid = activeBlock?.id;
      if (!sid) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      const busyKey = `${s.formation}\t${s.play_name}`;
      setSuggestBusy(busyKey);
      try {
        await postPlay.mutateAsync({
          scenarioId: sid,
          formation: s.formation,
          play_name: s.play_name,
        });
        addToast("Added to sheet.", "success");
      } catch (e) {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setSuggestBusy(null);
      }
    },
    [activeBlock?.id, postPlay, atCapacity, addToast],
  );

  const startGuidedGame = useCallback(async () => {
    const sh = sheetQuery.data;
    if (!sh) return;
    const name = sh.name.trim();
    const scheme = sh.scheme?.trim() || "Multiple";
    const offBook = cfb26.trim();
    if (!name || !offBook) {
      addToast(COULDNT_SAVE, "error");
      return;
    }
    setStartGuidedBusy(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: name,
          my_scheme: scheme,
          offensive_playbook: offBook,
          opponent_team: ONBOARDING_OPPONENT_TEAM,
          opponent_scheme: ONBOARDING_OPPONENT_SCHEME,
          game_date: new Date().toISOString().slice(0, 10),
          my_score: 0,
          opponent_score: 0,
          result: "W",
          play_sheet_id: sheetId,
          guided_onboarding_session: true,
        }),
      });
      const game = (await res.json()) as { id?: string };
      if (!game.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      setLastGame({ my_playbook: name, my_scheme: scheme });
      addToast(ONBOARDING_GAME_READY, "success");
      const scenarioParam = encodeURIComponent(activeScenario);
      router.push(`/film/${game.id}?guided=1&sheetScenario=${scenarioParam}`);
    } finally {
      setStartGuidedBusy(false);
    }
  }, [activeScenario, addToast, cfb26, router, setLastGame, sheetQuery.data, sheetId]);

  if (sheetQuery.isLoading) {
    return <PlaybookEditorSkeleton />;
  }

  if (sheetQuery.error || !sheet) {
    return (
      <div className="space-y-3">
        <p className="font-body text-red-300">{(sheetQuery.error as Error)?.message ?? "Play sheet not found"}</p>
        <BackNavLink href="/playbook" />
      </div>
    );
  }

  const saveSheetEdits = async () => {
    const trimmedName = editName.trim();
    const trimmedPlaybook = editPlaybook.trim();
    if (!trimmedName || !trimmedPlaybook) {
      addToast(COULDNT_SAVE, "error");
      return;
    }
    try {
      await updateSheet.mutateAsync({ name: trimmedName, cfb26_playbook: trimmedPlaybook });
      addToast("Play sheet saved.", "success");
      setEditorOpen(false);
    } catch (error) {
      addToast(COULDNT_SAVE, "error");
    }
  };

  const suggestions = scenarioPayload?.suggestions ?? [];

  const playSlotProps = {
    onAdd: openAdd,
    onRemove: (id: string) => {
      deletePlay
        .mutateAsync(id)
        .then(() => addToast("Removed from sheet.", "success"))
        .catch(() => addToast(COULDNT_SAVE, "error"));
    },
    dragId,
    setDragId,
    onReorder,
  } as const;

  const canTakeField =
    onboardingEditor && totalSheetPlays >= MIN_ONBOARDING_SHEET_PLAYS && !startGuidedBusy;
  const playsStillNeeded = Math.max(0, MIN_ONBOARDING_SHEET_PLAYS - totalSheetPlays);

  return (
    <div
      className={cn(
        onboardingEditor &&
          "flex min-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] flex-col",
      )}
    >
      <div className={cn("space-y-6", onboardingEditor && "min-h-0 flex-1 overflow-y-auto pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))]")}>
        {!onboardingEditor ? (
          <div className="space-y-3">
            <Breadcrumb segments={[{ label: "Play Sheet", href: "/playbook" }, { label: sheet.name }]} />
            <BackNavLink href="/playbook" />
          </div>
        ) : null}

        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{sheet.name}</h1>
            {!onboardingEditor ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                onClick={() => {
                  setEditName(sheet.name);
                  setEditPlaybook(cfb26);
                  setEditorOpen(true);
                }}
              >
                Edit
              </button>
            ) : null}
          </div>
          <p className="font-body text-sm text-slate-400">Built from {cfb26} playbook</p>
        </div>

        {!onboardingEditor ? (
          <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="mobile" />
        ) : null}

      <div className={cn("grid min-h-[50vh] gap-6", !onboardingEditor && "lg:grid-cols-[220px_1fr]")}>
        {!onboardingEditor ? (
          <aside className="hidden lg:block">
            <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Situations</p>
            <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="desktop" />
          </aside>
        ) : null}

        <section className="min-w-0 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
            Calls for: <span className="text-white">{scenarioDisplayLabel(activeScenario)}</span>
          </h2>

          {scenarioQuery.isError ? (
            <p className="font-body text-sm text-red-300">{(scenarioQuery.error as Error).message}</p>
          ) : scenarioQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-700 bg-slate-900 p-4 flex gap-3">
                  <div className="animate-pulse rounded-md bg-slate-700/55 h-10 w-10 shrink-0 rounded" />
                  <div className="min-w-0 flex-1 space-y-2 py-0.5">
                    <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[75%] max-w-xs" />
                    <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[50%] max-w-[180px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filled === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
              <p className="font-body text-base font-medium text-white">No calls for this situation yet.</p>
              <p className="mt-1 font-body text-sm text-slate-400">
                Add calls to build your call sheet.
              </p>
              <Button type="button" variant="default" className="mt-4 text-sm" onClick={openAdd}>
                Add call
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/90">
              <PlayTableHeader />
              <div>
                {sortedPlays.map((play, slotIndex) => (
                  <PlaySlot
                    key={play.id}
                    play={play}
                    slotIndex={slotIndex}
                    {...playSlotProps}
                    atCapacity={atCapacity && !play}
                  />
                ))}
                {filled < maxSlots ? (
                  <PlaySlot
                    key="slot-add-next"
                    play={null}
                    slotIndex={filled}
                    {...playSlotProps}
                    atCapacity={atCapacity}
                  />
                ) : null}
              </div>
            </div>
          )}

          {!onboardingEditor ? (
            <PlaySuggestions
              scenarioLabel={activeScenario}
              suggestions={suggestions}
              busyId={suggestBusy}
              onAdd={onSuggestAdd}
              scenarioFull={atCapacity}
            />
          ) : null}
        </section>
      </div>
      </div>

      <AddPlayDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
        }}
        cfb26Playbook={cfb26}
        scenarioName={activeScenario}
        onPick={onDrawerPick}
      />
      {editorOpen ? (
        <div
          className={cn("fixed inset-0 bg-black/70", overlayZ.radixDialog)}
          onClick={() => setEditorOpen(false)}
        >
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4",
              overlayZ.sheetShell,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full max-h-[90vh] min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Edit play sheet</h2>
                <button type="button" data-no-press className="p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setEditorOpen(false)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play sheet name</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25" />
                </label>
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Select CFB26 Playbook</span>
                  <input list="cfb26-playbook-options" value={editPlaybook} onChange={(e) => setEditPlaybook(e.target.value)} className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25" />
                  <datalist id="cfb26-playbook-options">
                    {cfb26PlaybookOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
              </div>
              <div className={modalCtaFooterClass}>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="default" className="flex-1" onClick={() => void saveSheetEdits()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog
        open={Boolean(replaceSuggest)}
        onOpenChange={(next) => {
          if (!next && !swapPlay.isPending) setReplaceSuggest(null);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-slate-700 bg-slate-900 p-0 text-slate-100 sm:max-w-md [&>button]:text-slate-400 [&>button]:hover:text-white"
          onPointerDownOutside={(e) => {
            if (swapPlay.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (swapPlay.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:text-left">
            <DialogTitle className="font-heading text-xl font-bold uppercase tracking-[0.12em] text-slate-100 pr-10 text-left text-lg">Replace a play</DialogTitle>
            {replaceSuggest ? (
              <DialogDescription className="mt-3 text-left font-body text-sm text-slate-400">
                This situation is full. Choose a play to replace with{" "}
                <span className="font-medium text-white">{normalizePlayName(replaceSuggest.play_name)}</span>.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {replaceSuggest ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-1">
              <ul className="space-y-2">
                {sortedPlays.map((play) => (
                  <li key={play.id}>
                    <button
                      type="button"
                      disabled={swapPlay.isPending}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2.5 text-start transition-colors hover:border-emerald-600/50 hover:bg-emerald-500/10 disabled:opacity-50"
                      onClick={async () => {
                        try {
                          await swapPlay.mutateAsync({
                            playId: play.id,
                            formation: replaceSuggest.formation,
                            play_name: replaceSuggest.play_name,
                          });
                          addToast("Replaced on sheet.", "success");
                          setReplaceSuggest(null);
                          setSuggestBusy(null);
                        } catch (e) {
                          const msg = e instanceof Error && e.message.includes("already exists")
                            ? e.message
                            : COULDNT_SAVE;
                          addToast(msg, "error");
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium uppercase text-white">{normalizePlayName(play.play_name)}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{play.formation}</p>
                      </div>
                      <span className="shrink-0 font-sans text-xs text-slate-500">Replace</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={modalCtaFooterClass}>
            <Button type="button" variant="secondary" className="flex-1 py-3" disabled={swapPlay.isPending} onClick={() => setReplaceSuggest(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {onboardingEditor ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
          <p className="font-body text-sm font-medium text-slate-100">
            Add {MIN_ONBOARDING_SHEET_PLAYS} calls to take the field.
          </p>
          <p className="mt-0.5 font-body text-sm text-slate-400">
            {playsStillNeeded > 0
              ? `${playsStillNeeded} more needed.`
              : "You're ready when you are."}
          </p>
          <Button
            type="button"
            variant="default"
            className="mt-3 w-full text-sm"
            disabled={!canTakeField}
            onClick={() => void startGuidedGame()}
          >
            {startGuidedBusy ? "Starting…" : ONBOARDING_START_LOGS}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
