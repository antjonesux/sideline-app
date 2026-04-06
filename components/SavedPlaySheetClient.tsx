"use client";

import { PlaySheetEditor } from "@/components/PlaySheetEditor";
import { PlaySheetView } from "@/components/PlaySheetView";
import { playSheetPlayToDraft } from "@/lib/mapPlayToDraft";
import type { PlaySheetWithPlays } from "@/lib/playSheetTypes";
import { playbookFromSchemeField } from "@/lib/resolvePlaybook";
import type { Scheme } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function SavedPlaySheetClient({
  schemeId,
  sheetId,
}: {
  schemeId: string;
  sheetId: string;
}) {
  const sheetViewMode = useGameStore((s) => s.sheetViewMode);
  const setSheetViewMode = useGameStore((s) => s.setSheetViewMode);
  const setActivePlaySheetId = useGameStore((s) => s.setActivePlaySheetId);

  const [editOpen, setEditOpen] = useState(false);

  const { data: sheet } = useQuery({
    queryKey: ["playsheet", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playsheets/${sheetId}`);
      if (!res.ok) return null;
      return (await res.json()) as PlaySheetWithPlays;
    },
    enabled: Boolean(sheetId),
  });

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
    enabled: Boolean(playbook) && editOpen,
    staleTime: 60 * 60_000,
  });

  const cfbByFormation = groupedRes?.grouped ?? {};

  const [rows, setRows] = useState(() =>
    (sheet?.plays ?? []).map((p) => playSheetPlayToDraft(p)),
  );

  useEffect(() => {
    if (sheet?.plays) {
      setRows(sheet.plays.map((p) => playSheetPlayToDraft(p)));
    }
  }, [sheet]);

  useEffect(() => {
    setActivePlaySheetId(sheetId);
  }, [sheetId, setActivePlaySheetId]);

  if (!sheet) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Loading play sheet…
        </p>
      </div>
    );
  }

  const matchup = `${scheme?.name ?? "Scheme"} vs ${sheet.defensive_scheme}`;

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-white/10 bg-black/30 px-4 py-6 md:px-10">
        <Link
          href={`/scheme/${schemeId}/gameplan`}
          className="font-mono text-xs text-[var(--accent-soft)]"
        >
          ← Game plan
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-[var(--chalk)]">
              {sheet.name}
            </h1>
            <p className="mt-2 font-mono text-sm text-[var(--chalk-muted)]">
              {matchup}
              {sheet.opponent_team ? ` · ${sheet.opponent_team}` : ""}
            </p>
          </div>
          <Link
            href="/playsheets"
            className="font-mono text-xs text-[var(--accent-soft)]"
          >
            All sheets
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen((o) => !o)}
          className="mt-4 rounded border border-white/15 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--chalk-muted)]"
        >
          {editOpen ? "Hide editor" : "Edit sheet"}
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-10">
        <PlaySheetView
          rows={rows}
          sheetViewMode={sheetViewMode}
          onSheetViewMode={setSheetViewMode}
        />
        {editOpen ? (
          <div className="mt-12 border-t border-white/10 pt-10">
            <h2 className="mb-6 font-display text-xl text-[var(--chalk)]">
              Editor
            </h2>
            <PlaySheetEditor
              defensiveScheme={sheet.defensive_scheme}
              playbook={playbook}
              sheetId={sheetId}
              rows={rows}
              onRowsChange={setRows}
              cfbByFormation={cfbByFormation}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
