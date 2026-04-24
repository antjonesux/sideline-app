"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { scenarioDisplayLabel, sheetCfb26Playbook, scenarioMaxSlots, sortScenariosByCanonicalOrder } from "@/lib/playbookUtils";
import { normalizePlayName } from "@/lib/utils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import {
  COULDNT_SAVE,
  ONBOARDING_EDITOR_BANNER,
  ONBOARDING_GAME_READY,
  ONBOARDING_OPPONENT_SCHEME,
  ONBOARDING_OPPONENT_TEAM,
  ONBOARDING_SHEET_PLAY_COUNT,
  ONBOARDING_START_LOGS,
} from "@/lib/coachCopy";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
import { useScrollLock } from "@/lib/useScrollLock";
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
  const replaceTitleId = useId();
  useScrollLock(editorOpen || Boolean(replaceSuggest));

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
    if (!scenarios.some((s) => s.scenario === activeScenario)) {
      setActiveScenario(scenarios[0]?.scenario ?? "1st Down");
    }
  }, [scenarios, activeScenario]);

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

  const cfb26 = sheet ? sheetCfb26Playbook(sheet) : "";
  const cfb26PlaybookOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of setupQuery.data?.offensiveTeams ?? []) {
      if (row.playbook_name?.trim()) set.add(row.playbook_name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [setupQuery.data?.offensiveTeams]);

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
    const offBook = sheetCfb26Playbook(sh).trim();
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
        }),
      });
      const game = (await res.json()) as { id?: string };
      if (!game.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      setLastGame({ my_playbook: name, my_scheme: scheme });
      addToast(ONBOARDING_GAME_READY, "success");
      router.push(`/film/${game.id}?guided=1`);
    } finally {
      setStartGuidedBusy(false);
    }
  }, [addToast, router, setLastGame, sheetQuery.data, sheetId]);

  if (sheetQuery.isLoading) {
    return <PlaybookEditorSkeleton />;
  }

  if (sheetQuery.error || !sheet) {
    return (
      <div className="space-y-3">
        <p className="font-body text-red-300">{(sheetQuery.error as Error)?.message ?? "Play sheet not found"}</p>
        <BackToFilmLink href="/playbook" />
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

  const canStartGuidedLogs =
    onboardingEditor && totalSheetPlays >= MIN_ONBOARDING_SHEET_PLAYS && !startGuidedBusy;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb segments={[{ label: "Game Plan", href: "/playbook" }, { label: sheet.name }]} />
        <BackToFilmLink href="/playbook" />
      </div>

      {onboardingEditor ? (
        <div className="app-card app-card-pad space-y-3 border border-emerald-800/35 bg-emerald-950/15">
          <p className="font-body text-sm leading-relaxed text-slate-200">{ONBOARDING_EDITOR_BANNER}</p>
          <p className="font-mono text-xs text-slate-500">{ONBOARDING_SHEET_PLAY_COUNT(totalSheetPlays, MIN_ONBOARDING_SHEET_PLAYS)}</p>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={!canStartGuidedLogs}
            onClick={() => void startGuidedGame()}
          >
            {startGuidedBusy ? "Starting…" : ONBOARDING_START_LOGS}
          </button>
        </div>
      ) : null}
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="app-editor-title mt-0">{sheet.name}</h1>
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
        </div>
        <p className="font-body text-sm text-slate-400">
          Built from {cfb26} playbook
        </p>
      </div>

      <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="mobile" />

      <div className="grid min-h-[50vh] gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="app-field-label">Situations</p>
          <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="desktop" />
        </aside>

        <section className="min-w-0 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
            Plays for: <span className="text-white">{scenarioDisplayLabel(activeScenario)}</span>
          </h2>

          {scenarioQuery.isError ? (
            <p className="font-body text-sm text-red-300">{(scenarioQuery.error as Error).message}</p>
          ) : scenarioQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="app-card app-card-pad flex gap-3">
                  <div className="app-skeleton h-10 w-10 shrink-0 rounded" />
                  <div className="min-w-0 flex-1 space-y-2 py-0.5">
                    <div className="app-skeleton h-3 w-[75%] max-w-xs" />
                    <div className="app-skeleton h-3 w-[50%] max-w-[180px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filled === 0 ? (
            <div className="app-card app-card-pad text-center">
              <p className="font-body text-base font-medium text-white">No plays for this situation yet.</p>
              <p className="mt-1 font-body text-sm text-slate-400">
                Add plays to build your call sheet.
              </p>
              <button type="button" className="btn-primary mt-4 text-sm" onClick={openAdd}>
                Add Play
              </button>
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

          <PlaySuggestions
            scenarioLabel={activeScenario}
            suggestions={suggestions}
            busyId={suggestBusy}
            onAdd={onSuggestAdd}
            scenarioFull={atCapacity}
          />
        </section>
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
        <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setEditorOpen(false)}>
          <div className="fixed inset-x-0 bottom-0 z-[51] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4" onClick={(e) => e.stopPropagation()}>
            <div className="app-card flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="app-section-title text-lg">Edit play sheet</h2>
                <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setEditorOpen(false)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto p-4">
                <label className="space-y-1">
                  <span className="app-field-label">Play sheet name</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="app-input" />
                </label>
                <label className="space-y-1">
                  <span className="app-field-label">Select CFB26 Playbook</span>
                  <input list="cfb26-playbook-options" value={editPlaybook} onChange={(e) => setEditPlaybook(e.target.value)} className="app-input" />
                  <datalist id="cfb26-playbook-options">
                    {cfb26PlaybookOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
                <div className="pt-4">
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setEditorOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary flex-1" onClick={() => void saveSheetEdits()}>
                    Save
                  </button>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={`hs-overlay fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto ${
          replaceSuggest ? "pointer-events-auto bg-black/70" : "pointer-events-none hidden"
        }`}
        role="dialog"
        aria-modal={Boolean(replaceSuggest)}
        aria-hidden={!replaceSuggest}
        aria-labelledby={replaceTitleId}
        onClick={(e) => {
          if (swapPlay.isPending) return;
          if (e.target === e.currentTarget) setReplaceSuggest(null);
        }}
      >
        <div className="fixed inset-x-0 bottom-0 z-[61] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">
          <div
            className="pointer-events-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 id={replaceTitleId} className="app-section-title text-lg">Replace a play</h2>
              <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setReplaceSuggest(null)}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M6 6 18 18M18 6 6 18" />
                </svg>
                <span className="sr-only">Close</span>
              </button>
            </div>
            {replaceSuggest ? (
              <div className="space-y-3 overflow-y-auto p-4">
                <p className="font-body text-sm text-slate-400">
                  This situation is full. Choose a play to replace with{" "}
                  <span className="font-medium text-white">{normalizePlayName(replaceSuggest.play_name)}</span>.
                </p>
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
            <div className="flex shrink-0 gap-2 border-t border-slate-800 p-3">
              <button type="button" className="btn-secondary flex-1 py-3" disabled={swapPlay.isPending} onClick={() => setReplaceSuggest(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
