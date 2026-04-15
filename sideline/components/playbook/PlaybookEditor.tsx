"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { scenarioMaxSlots } from "@/lib/playbookUtils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
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

export function PlaybookEditor({ sheetId }: { sheetId: string }) {
  const queryClient = useQueryClient();
  const [activeScenario, setActiveScenario] = useState("1st Down");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replacePlayId, setReplacePlayId] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);

  const sheetQuery = useQuery({
    queryKey: ["playbook", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playbook/${sheetId}`);
      const j = (await res.json()) as SheetPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load playbook");
      return j;
    },
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

  const sheet = sheetQuery.data;
  const scenarios = sheet?.scenarios ?? [];
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
    setReplacePlayId(null);
    setDrawerOpen(true);
  }, []);

  const openSwap = useCallback((playId: string) => {
    setReplacePlayId(playId);
    setDrawerOpen(true);
  }, []);

  const onDrawerPick = useCallback(
    async (formation: string, play_name: string) => {
      try {
        if (replacePlayId) {
          await swapPlay.mutateAsync({ playId: replacePlayId, formation, play_name });
        } else if (scenarioPayload?.scenarioId) {
          await postPlay.mutateAsync({ scenarioId: scenarioPayload.scenarioId, formation, play_name });
        }
      } catch (e) {
        window.alert((e as Error).message);
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
        }
      } catch (e) {
        window.alert((e as Error).message);
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
        <p className="font-body text-red-300">{(sheetQuery.error as Error)?.message ?? "Playbook not found"}</p>
        <Link href="/playbook" className="font-body text-emerald-400 hover:underline">
          ← Back to playbooks
        </Link>
      </div>
    );
  }

  const stats = scenarioPayload?.scenarioStats ?? {};
  const formationStats = scenarioPayload?.formationStats ?? {};
  const suggestions = scenarioPayload?.suggestions ?? [];
  const isScript = activeScenario === "Opening Script";

  const slots: (SheetPlayRow | null)[] = Array.from({ length: maxSlots }, (_, i) => sortedPlays[i] ?? null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href="/playbook" className="font-body text-xs text-emerald-500/90 hover:text-emerald-400">
            ← All playbooks
          </Link>
          <h1 className="app-editor-title">{sheet.name}</h1>
          <p className="font-body text-sm text-slate-400">{cfb26} playbook · {sheet.scheme}</p>
        </div>
      </div>

      <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="mobile" />

      <div className="grid min-h-[50vh] gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="app-field-label">Situations</p>
          <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario} variant="desktop" />
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
              Plays for: <span className="text-white">{activeScenario}</span>
            </h2>
            <span className="font-mono text-xs text-slate-500">
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
          ) : (
            <div className="space-y-2">
              {slots.map((play, slotIndex) => (
                <PlaySlot
                  key={play?.id ?? `empty-${slotIndex}`}
                  play={play}
                  slotIndex={slotIndex}
                  isScript={isScript}
                  scenarioStats={stats}
                  atCapacity={atCapacity && !play}
                  onAdd={openAdd}
                  onRemove={(id) => deletePlay.mutate(id)}
                  onEdit={openSwap}
                  onScriptNote={
                    isScript
                      ? (id, note) => {
                          scriptNote.mutate({ playId: id, note });
                        }
                      : undefined
                  }
                  dragId={dragId}
                  setDragId={setDragId}
                  onReorder={onReorder}
                />
              ))}
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
        scenarioStats={stats}
        formationStats={formationStats}
        onPick={onDrawerPick}
      />
    </div>
  );
}
