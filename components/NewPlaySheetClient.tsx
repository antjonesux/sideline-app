"use client";

import { PlaySheetEditor } from "@/components/PlaySheetEditor";
import { fetchGamePlanBundle } from "@/lib/fetchGamePlan";
import { generateDraftPlaySheet } from "@/lib/generateDraftPlaySheet";
import { draftRowToApiPayload } from "@/lib/mapPlayToDraft";
import {
  clearDraftStorage,
  loadDraftFromStorage,
  saveDraftToStorage,
} from "@/lib/playSheetDraftStorage";
import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { playbookFromSchemeField } from "@/lib/resolvePlaybook";
import { SCHEME_IDS } from "@/lib/staticData";
import type { Scheme } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function NewPlaySheetClient({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const selectedDefensiveScheme = useGameStore((s) => s.selectedDefensiveScheme);
  const selectedOpponentTeam = useGameStore((s) => s.selectedOpponentTeam);
  const setActivePlaySheetId = useGameStore((s) => s.setActivePlaySheetId);

  const [rows, setRows] = useState<DraftPlayRow[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: scheme } = useQuery({
    queryKey: ["scheme-meta", schemeId],
    queryFn: async () => {
      const res = await fetch(`/api/schemes/${schemeId}`);
      if (!res.ok) return null;
      return (await res.json()) as Scheme;
    },
    enabled: Boolean(schemeId),
  });

  const playbook = useMemo(
    () => playbookFromSchemeField(scheme?.cfb26_playbook),
    [scheme?.cfb26_playbook],
  );

  const { data: groupedRes } = useQuery({
    queryKey: ["cfb26-grouped", playbook],
    queryFn: async () => {
      const res = await fetch(
        `/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&grouped=1`,
      );
      if (!res.ok) return { grouped: {} as Record<string, string[]> };
      return (await res.json()) as { grouped: Record<string, string[]> };
    },
    enabled: Boolean(playbook),
    staleTime: 60 * 60_000,
  });

  const cfbByFormation = useMemo(
    () => groupedRes?.grouped ?? {},
    [groupedRes?.grouped],
  );

  const playsByFormation = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [f, names] of Object.entries(cfbByFormation)) {
      m.set(f, names);
    }
    return m;
  }, [cfbByFormation]);

  const { data: bundle, isSuccess: bundleOk } = useQuery({
    queryKey: ["gameplan", schemeId, selectedDefensiveScheme],
    queryFn: () =>
      fetchGamePlanBundle(schemeId, selectedDefensiveScheme as string),
    enabled: Boolean(schemeId && selectedDefensiveScheme),
  });

  const isDemoMatchup =
    schemeId === SCHEME_IDS.arbuckle &&
    selectedDefensiveScheme === "4-2-5" &&
    playbook === "Washington State";

  const cfbReady =
    isDemoMatchup || Object.keys(cfbByFormation).length > 0;

  useEffect(() => {
    if (!selectedDefensiveScheme || !bundleOk || !bundle) return;
    const stored = loadDraftFromStorage(schemeId, selectedDefensiveScheme);
    if (stored?.rows?.length) {
      setRows(stored.rows);
      setDraftSavedAt(stored.savedAt);
      return;
    }
    if (!cfbReady) return;
    const draft = generateDraftPlaySheet({
      offensiveSchemeId: schemeId,
      defensiveScheme: selectedDefensiveScheme,
      adjustedCalls: bundle.adjustedCalls,
      playsByFormation,
      playbook,
    });
    setRows(draft);
  }, [
    schemeId,
    selectedDefensiveScheme,
    bundleOk,
    bundle,
    playsByFormation,
    playbook,
    cfbReady,
  ]);

  useEffect(() => {
    if (!selectedDefensiveScheme || rows.length === 0) return;
    saveDraftToStorage(schemeId, selectedDefensiveScheme, rows);
    setDraftSavedAt(Date.now());
  }, [rows, schemeId, selectedDefensiveScheme]);

  const onRowsChange = useCallback((next: DraftPlayRow[]) => {
    setRows(next);
  }, []);

  const saveSheet = async () => {
    const name = sheetName.trim() || "My play sheet";
    if (!selectedDefensiveScheme) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playsheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          offensive_scheme_id: schemeId,
          defensive_scheme: selectedDefensiveScheme,
          opponent_team: selectedOpponentTeam,
          plays: rows.map(draftRowToApiPayload),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const created = (await res.json()) as { id: string };
      clearDraftStorage(schemeId, selectedDefensiveScheme);
      setActivePlaySheetId(created.id);
      setSaveOpen(false);
      router.push(`/scheme/${schemeId}/playsheet/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedDefensiveScheme) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Select an opponent from your scheme dashboard first.
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

  if (!bundle) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Loading game plan data…
        </p>
      </div>
    );
  }

  const chip = selectedOpponentTeam
    ? `${selectedOpponentTeam} → ${selectedDefensiveScheme}`
    : selectedDefensiveScheme;

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-white/10 bg-black/30 px-4 py-6 md:px-10">
        <Link
          href={`/scheme/${schemeId}/gameplan`}
          className="font-mono text-xs text-[var(--accent-soft)]"
        >
          ← Game plan
        </Link>
        <h1 className="mt-3 font-display text-3xl text-[var(--chalk)]">
          Play sheet editor
        </h1>
        <p className="mt-2 font-mono text-sm text-[var(--chalk-muted)]">
          Matchup · <span className="text-[var(--accent-soft)]">{chip}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="rounded border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-4 py-2 font-mono text-sm text-[var(--accent-soft)]"
          >
            Name & save sheet
          </button>
          <span className="font-mono text-[10px] text-[var(--chalk-muted)]">
            {draftSavedAt
              ? `Draft saved · ${new Date(draftSavedAt).toLocaleTimeString()}`
              : null}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-10">
        {rows.length ? (
          <PlaySheetEditor
            defensiveScheme={selectedDefensiveScheme}
            playbook={playbook}
            rows={rows}
            onRowsChange={onRowsChange}
            cfbByFormation={cfbByFormation}
          />
        ) : (
          <p className="font-mono text-sm text-[var(--chalk-muted)]">
            Preparing draft…
          </p>
        )}
      </main>

      {saveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/15 bg-[var(--bg)] p-6 shadow-xl">
            <h2 className="font-display text-xl text-[var(--chalk)]">
              Name this sheet
            </h2>
            <p className="mt-2 font-mono text-xs text-[var(--chalk-muted)]">
              e.g. vs Georgia — Week 3, or Road game vs 4-2-5
            </p>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="mt-4 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--chalk)]"
              placeholder="Sheet name"
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded border border-white/15 px-4 py-2 font-mono text-xs text-[var(--chalk-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSheet()}
                className="rounded border border-[var(--accent)]/50 bg-[var(--accent)]/20 px-4 py-2 font-mono text-xs text-[var(--accent-soft)] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save to cloud"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
