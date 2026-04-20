"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { sheetCfb26Playbook, scenarioMaxSlots, sortScenariosByCanonicalOrder } from "@/lib/playbookUtils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { normalizePlayName } from "@/lib/utils";
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

export function PlaybookEditor({ sheetId }: { sheetId: string }) {
  const queryClient = useQueryClient();
  const [activeScenario, setActiveScenario] = useState("1st Down");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replacePlayId, setReplacePlayId] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [removePlayId, setRemovePlayId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlaybook, setEditPlaybook] = useState("");
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
  const scenarioPayload = scenarioQuery.data;

  useEffect(() => {
    if (!scenarios.length) return;
    if (!scenarios.some((s) => s.scenario === activeScenario)) {
      setActiveScenario(scenarios[0]?.scenario ?? "1st Down");
    }
  }, [scenarios, activeScenario]);

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

  const scriptNote = useMutation({
    mutationFn: async ({ playId, note }: { playId: string; note: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "script_note", playId, script_note: note }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not save note");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const swapPlay = useMutation({
    mutationFn: async ({ playId, formation, play_name }: { playId: string; formation: string; play_name: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "swap", playId, formation, play_name }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not update play");
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
    setReplacePlayId(null);
    setDrawerOpen(true);
  }, [addToast, atCapacity, maxSlots]);

  const openSwap = useCallback((playId: string) => {
    setReplacePlayId(playId);
    setDrawerOpen(true);
  }, []);

  const onDrawerPick = useCallback(
    async (formation: string, play_name: string) => {
      try {
        if (replacePlayId) {
          await swapPlay.mutateAsync({ playId: replacePlayId, formation, play_name });
          addToast("Added to sheet.", "success");
        } else if (scenarioPayload?.scenarioId) {
          await postPlay.mutateAsync({ scenarioId: scenarioPayload.scenarioId, formation, play_name });
          addToast("Added to sheet.", "success");
        }
      } catch (e) {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setDrawerOpen(false);
        setReplacePlayId(null);
      }
    },
    [replacePlayId, scenarioPayload?.scenarioId, postPlay, swapPlay],
  );

  const onSuggestAdd = useCallback(
    async (s: SuggestionRow) => {
      const id = `${s.formation}\t${s.play_name}`;
      setSuggestBusy(id);
      try {
        if (scenarioPayload?.scenarioId) {
          await postPlay.mutateAsync({
            scenarioId: scenarioPayload.scenarioId,
            formation: s.formation,
            play_name: s.play_name,
          });
          addToast("Added to sheet.", "success");
        }
      } catch (e) {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setSuggestBusy(null);
      }
    },
    [scenarioPayload?.scenarioId, postPlay],
  );

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

  const stats = scenarioPayload?.scenarioStats ?? {};
  const formationStats = scenarioPayload?.formationStats ?? {};
  const suggestions = scenarioPayload?.suggestions ?? [];
  const isScript = activeScenario === "Opening Script";

  const pendingRemovePlayRow = removePlayId ? sortedPlays.find((p) => p.id === removePlayId) : null;
  const playSlotProps = {
    isScript,
    scenarioStats: stats,
    onAdd: openAdd,
    onRemove: (id: string) => setRemovePlayId(id),
    onEdit: openSwap,
    onScriptNote: isScript
      ? (id: string, note: string) => {
          scriptNote.mutate({ playId: id, note });
        }
      : undefined,
    dragId,
    setDragId,
    onReorder,
  } as const;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb segments={[{ label: "Game Plan", href: "/playbook" }, { label: sheet.name }]} />
        <BackToFilmLink href="/playbook" />
      </div>
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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
              Plays for: <span className="text-white">{activeScenario}</span>
            </h2>
            <span className="font-body text-xs text-slate-500">
              {filled}/{maxSlots}
            </span>
          </div>

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
            <div className="space-y-2">
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
          )}

          <PlaySuggestions
            scenarioLabel={activeScenario}
            suggestions={suggestions}
            busyId={suggestBusy}
            onAdd={onSuggestAdd}
          />
        </section>
      </div>

      <AddPlayDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setReplacePlayId(null);
        }}
        cfb26Playbook={cfb26}
        scenarioName={activeScenario}
        onPick={onDrawerPick}
      />
      {editorOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setEditorOpen(false)}>
          <div className="fixed inset-x-0 bottom-0 z-[51] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4" onClick={(e) => e.stopPropagation()}>
            <div className="app-card flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="app-section-title text-lg">Edit play sheet</h2>
                <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setEditorOpen(false)}>
                  <span aria-hidden>✕</span>
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
      ) : null}
      <ConfirmDestructiveModal
        open={removePlayId !== null}
        onClose={() => setRemovePlayId(null)}
        title="Remove play"
        confirmLabel="Remove play"
        message={
          <>
            Pulls{" "}
            <strong className="font-mono font-semibold text-white">
              {pendingRemovePlayRow
                ? `${pendingRemovePlayRow.formation} · ${normalizePlayName(pendingRemovePlayRow.play_name)}`
                : "—"}
            </strong>{" "}
            off this situation. Can&apos;t be undone.
          </>
        }
        busy={deletePlay.isPending}
        onConfirm={async () => {
          if (!removePlayId) return;
          try {
            await deletePlay.mutateAsync(removePlayId);
            addToast("Removed from sheet.", "success");
            setRemovePlayId(null);
          } catch {
            addToast(COULDNT_SAVE, "error");
          }
        }}
      />
    </div>
  );
}
