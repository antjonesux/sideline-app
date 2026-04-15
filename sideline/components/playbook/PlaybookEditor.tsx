"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { scenarioMaxSlots } from "@/lib/playbookUtils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import { useToastStore } from "@/store/toastStore";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeScenario, setActiveScenario] = useState("1st Down");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replacePlayId, setReplacePlayId] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPlaybook, setEditPlaybook] = useState("");
  const addToast = useToastStore((s) => s.addToast);

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
  const setupQuery = useQuery({
    queryKey: ["film-setup"],
    queryFn: async () => {
      const res = await fetch("/api/film/setup");
      if (!res.ok) throw new Error("Failed to load playbooks");
      return res.json() as Promise<SetupApi>;
    },
    staleTime: 60 * 60 * 1000,
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
      if (!res.ok) throw new Error(j.error ?? "Could not update playbook");
      return j;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
    },
  });
  const deleteSheet = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playbook/${sheetId}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not delete playbook");
      return j;
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
      addToast(`Scenario is full (${maxSlots}/${maxSlots} plays)`, "warning");
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
          addToast("Play added", "success");
        } else if (scenarioPayload?.scenarioId) {
          await postPlay.mutateAsync({ scenarioId: scenarioPayload.scenarioId, formation, play_name });
          addToast("Play added", "success");
        }
      } catch (e) {
        addToast("Failed to save", "error");
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
          addToast("Play added", "success");
        }
      } catch (e) {
        addToast("Failed to save", "error");
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

  const saveSheetEdits = async () => {
    const trimmedName = editName.trim();
    const trimmedPlaybook = editPlaybook.trim();
    if (!trimmedName || !trimmedPlaybook) {
      addToast("Failed to save", "error");
      return;
    }
    try {
      await updateSheet.mutateAsync({ name: trimmedName, cfb26_playbook: trimmedPlaybook });
      addToast("Playbook updated", "success");
      setEditorOpen(false);
    } catch (error) {
      addToast("Failed to save", "error");
    }
  };

  const onDeleteSheet = async () => {
    try {
      await deleteSheet.mutateAsync();
      addToast("Playbook deleted", "success");
      router.push("/playbook");
    } catch (error) {
      addToast("Failed to save", "error");
    }
  };

  const stats = scenarioPayload?.scenarioStats ?? {};
  const formationStats = scenarioPayload?.formationStats ?? {};
  const suggestions = scenarioPayload?.suggestions ?? [];
  const isScript = activeScenario === "Opening Script";

  const slots: (SheetPlayRow | null)[] = Array.from({ length: maxSlots }, (_, i) => sortedPlays[i] ?? null);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb segments={[{ label: "Playbook", href: "/playbook" }, { label: sheet.name }]} />
        <BackToFilmLink href="/playbook" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="app-editor-title">{sheet.name}</h1>
          <p className="font-body text-sm text-slate-400">{cfb26} playbook · {sheet.scheme}</p>
        </div>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => {
            setEditName(sheet.name);
            setEditPlaybook(cfb26);
            setEditorOpen(true);
          }}
        >
          Edit
        </button>
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
                  onRemove={(id) => {
                    deletePlay.mutate(id, {
                      onSuccess: () => addToast("Play removed", "success"),
                      onError: () => addToast("Failed to save", "error"),
                    });
                  }}
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
          {slots.every((slot) => !slot) ? (
            <div className="app-card app-card-pad text-center">
              <p className="font-body text-base font-medium text-white">No plays for this situation yet.</p>
              <p className="mt-1 font-body text-sm text-slate-400">
                Add plays from your playbook to build your call sheet.
              </p>
              <button type="button" className="btn-primary mt-4 text-sm" onClick={openAdd}>
                + Add Play
              </button>
            </div>
          ) : null}
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
      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="app-card w-full max-w-md space-y-4 p-4">
            <h2 className="app-section-title">Edit Playbook</h2>
            <label className="space-y-1">
              <span className="app-field-label">Playbook name</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="app-input" />
            </label>
            <label className="space-y-1">
              <span className="app-field-label">CFB26 Playbook</span>
              <input list="cfb26-playbook-options" value={editPlaybook} onChange={(e) => setEditPlaybook(e.target.value)} className="app-input" />
              <datalist id="cfb26-playbook-options">
                {cfb26PlaybookOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </label>
            <button type="button" className="font-body text-sm text-red-300 hover:text-red-200" onClick={() => setConfirmDeleteOpen(true)}>
              Delete Playbook
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditorOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => void saveSheetEdits()}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmDeleteOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="app-card w-full max-w-md space-y-4 p-4">
            <h3 className="app-section-title">Delete playbook?</h3>
            <p className="font-body text-sm text-slate-300">Are you sure? This will delete the playbook and all its plays.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-destructive-solid flex-1" onClick={() => void onDeleteSheet()}>
                Delete Playbook
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
