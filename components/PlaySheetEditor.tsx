"use client";

import { PlayCard } from "@/components/PlayCard";
import { PlaySwapDrawer } from "@/components/PlaySwapDrawer";
import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { draftRowToApiPayload } from "@/lib/mapPlayToDraft";
import { PLAY_SHEET_SITUATIONS, situationOrderIndex } from "@/lib/playSheetSituations";
import { suggestCoachingAndCounter } from "@/lib/suggestPlayMetadata";
import { useCallback, useMemo, useState } from "react";

export function PlaySheetEditor({
  defensiveScheme,
  playbook,
  sheetId,
  rows,
  onRowsChange,
  cfbByFormation,
}: {
  defensiveScheme: string;
  playbook: string;
  sheetId?: string | null;
  rows: DraftPlayRow[];
  onRowsChange: (next: DraftPlayRow[]) => void;
  cfbByFormation: Record<string, string[]>;
}) {
  const [activeSituation, setActiveSituation] = useState<string>(
    PLAY_SHEET_SITUATIONS[0],
  );
  const [swapKey, setSwapKey] = useState<string | null>(null);

  const situationRows = useMemo(() => {
    return rows
      .filter((r) => r.situation === activeSituation)
      .sort((a, b) => (a.play_order ?? 0) - (b.play_order ?? 0));
  }, [rows, activeSituation]);

  const replaceRow = useCallback(
    (clientKey: string, patch: Partial<DraftPlayRow>) => {
      const next = rows.map((r) =>
        r.clientKey === clientKey ? { ...r, ...patch } : r,
      );
      onRowsChange(next);
    },
    [rows, onRowsChange],
  );

  const persistPlay = useCallback(
    async (row: DraftPlayRow, patch: Record<string, unknown>) => {
      if (!sheetId || !row.id) return;
      await fetch(`/api/playsheets/${sheetId}/plays/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [sheetId],
  );

  const applySwap = useCallback(
    (clientKey: string, pick: { formation: string; play_name: string; play_type: string | null }) => {
      const meta = suggestCoachingAndCounter(
        defensiveScheme,
        pick.play_name,
        pick.play_type,
      );
      const row = rows.find((r) => r.clientKey === clientKey);
      if (!row) return;
      replaceRow(clientKey, {
        formation: pick.formation,
        play_name: pick.play_name,
        coaching_note: meta.coaching_note,
        counter_formation: meta.counter_formation,
        counter_play: meta.counter_play,
      });
      void persistPlay(
        { ...row, ...pick, coaching_note: meta.coaching_note },
        {
          formation: pick.formation,
          play_name: pick.play_name,
          coaching_note: meta.coaching_note,
          counter_formation: meta.counter_formation,
          counter_play: meta.counter_play,
        },
      );
    },
    [defensiveScheme, rows, replaceRow, persistPlay],
  );

  const toggleFeatured = (clientKey: string) => {
    const row = rows.find((r) => r.clientKey === clientKey);
    if (!row) return;
    const v = !row.is_featured;
    replaceRow(clientKey, { is_featured: v });
    void persistPlay({ ...row, is_featured: v }, { is_featured: v });
  };

  const onNote = (clientKey: string, note: string) => {
    const t = note.slice(0, 100);
    const row = rows.find((r) => r.clientKey === clientKey);
    replaceRow(clientKey, { custom_note: t || null });
    if (row) void persistPlay({ ...row, custom_note: t || null }, { custom_note: t || null });
  };

  const addAlternate = async () => {
    const sorted = situationRows;
    if (sorted.length >= 2) return;
    const base = sorted[0];
    if (!base) return;
    const names = cfbByFormation[base.formation] ?? [];
    const altName =
      names.find((n) => n !== base.play_name) ?? names[1] ?? base.play_name;
    const meta = suggestCoachingAndCounter(
      defensiveScheme,
      altName,
      "Pass",
    );
    const newRow: DraftPlayRow = {
      clientKey: crypto.randomUUID(),
      situation: activeSituation,
      situation_order: situationOrderIndex(activeSituation),
      play_order: 1,
      formation: base.formation,
      play_name: altName,
      coaching_note: meta.coaching_note,
      counter_formation: meta.counter_formation,
      counter_play: meta.counter_play,
      custom_note: null,
      is_featured: false,
      is_used: false,
    };

    if (sheetId) {
      const res = await fetch(`/api/playsheets/${sheetId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftRowToApiPayload(newRow)),
      });
      if (res.ok) {
        const saved = (await res.json()) as { id: string };
        onRowsChange([
          ...rows,
          { ...newRow, id: saved.id, clientKey: saved.id },
        ]);
      }
      return;
    }

    onRowsChange([...rows, newRow]);
  };

  const removeRow = async (clientKey: string) => {
    const row = rows.find((r) => r.clientKey === clientKey);
    if (!row || (row.play_order ?? 0) === 0) return;
    if (sheetId && row.id) {
      await fetch(`/api/playsheets/${sheetId}/plays/${row.id}`, {
        method: "DELETE",
      });
    }
    onRowsChange(rows.filter((r) => r.clientKey !== clientKey));
  };

  const moveRow = async (clientKey: string, dir: -1 | 1) => {
    const sorted = [...situationRows];
    const i = sorted.findIndex((r) => r.clientKey === clientKey);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const oa = a.play_order ?? 0;
    const ob = b.play_order ?? 0;
    replaceRow(a.clientKey, { play_order: ob });
    replaceRow(b.clientKey, { play_order: oa });
    if (sheetId && a.id && b.id) {
      await persistPlay(a, { play_order: ob });
      await persistPlay(b, { play_order: oa });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr]">
      <aside className="space-y-1 rounded-lg border border-white/10 bg-black/25 p-2">
        <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
          Situations
        </p>
        {PLAY_SHEET_SITUATIONS.map((sit) => {
          const count = rows.filter((r) => r.situation === sit).length;
          const on = activeSituation === sit;
          return (
            <button
              key={sit}
              type="button"
              onClick={() => setActiveSituation(sit)}
              className={`flex w-full items-center justify-between rounded px-2 py-2 text-left font-mono text-xs transition ${
                on
                  ? "bg-[var(--accent)]/20 text-[var(--chalk)]"
                  : "text-[var(--chalk-muted)] hover:bg-white/5"
              }`}
            >
              <span>{sit}</span>
              <span className="text-[10px] text-[var(--chalk-muted)]">
                {count}
              </span>
            </button>
          );
        })}
      </aside>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl text-[var(--chalk)]">
            {activeSituation}
          </h2>
          <button
            type="button"
            onClick={() => void addAlternate()}
            disabled={situationRows.length >= 2}
            className="rounded border border-white/15 px-3 py-1.5 font-mono text-xs text-[var(--accent-soft)] disabled:opacity-40"
          >
            Add alternate (max 2)
          </button>
        </div>
        <div className="space-y-4">
          {situationRows.map((row, idx) => (
            <PlayCard
              key={row.clientKey}
              row={row}
              defensiveScheme={defensiveScheme}
              onSwap={() => setSwapKey(row.clientKey)}
              onToggleFeatured={() => toggleFeatured(row.clientKey)}
              onCustomNoteChange={(n) => onNote(row.clientKey, n)}
              onMoveUp={idx > 0 ? () => void moveRow(row.clientKey, -1) : undefined}
              onMoveDown={
                idx < situationRows.length - 1
                  ? () => void moveRow(row.clientKey, 1)
                  : undefined
              }
              onRemove={
                (row.play_order ?? 0) > 0
                  ? () => void removeRow(row.clientKey)
                  : undefined
              }
              canRemove={(row.play_order ?? 0) > 0}
            />
          ))}
        </div>
      </div>

      <PlaySwapDrawer
        open={Boolean(swapKey)}
        onClose={() => setSwapKey(null)}
        playbook={playbook}
        defensiveScheme={defensiveScheme}
        onSelect={(pick) => {
          if (swapKey) applySwap(swapKey, pick);
        }}
      />
    </div>
  );
}
