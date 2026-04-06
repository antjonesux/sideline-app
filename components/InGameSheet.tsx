"use client";

import { PlaySwapDrawer } from "@/components/PlaySwapDrawer";
import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { suggestCoachingAndCounter } from "@/lib/suggestPlayMetadata";
import { useMemo, useState } from "react";

export function InGameSheet({
  rows,
  activeSituation,
  sheetId,
  defensiveScheme,
  playbook,
  onRowsChange,
}: {
  rows: DraftPlayRow[];
  activeSituation: string | null;
  sheetId: string;
  defensiveScheme: string;
  playbook: string;
  onRowsChange: (next: DraftPlayRow[]) => void;
}) {
  const [swapKey, setSwapKey] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!activeSituation) return [];
    const block = rows.filter((r) => r.situation === activeSituation);
    return [...block].sort((a, b) => {
      const f = Number(b.is_featured) - Number(a.is_featured);
      if (f !== 0) return f;
      return (a.play_order ?? 0) - (b.play_order ?? 0);
    });
  }, [rows, activeSituation]);

  const patchRow = async (clientKey: string, patch: Partial<DraftPlayRow>) => {
    const row = rows.find((r) => r.clientKey === clientKey);
    if (!row?.id) return;
    await fetch(`/api/playsheets/${sheetId}/plays/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    onRowsChange(rows.map((r) => (r.clientKey === clientKey ? { ...r, ...patch } : r)));
  };

  const applySwap = async (
    clientKey: string,
    pick: { formation: string; play_name: string; play_type: string | null },
  ) => {
    const meta = suggestCoachingAndCounter(
      defensiveScheme,
      pick.play_name,
      pick.play_type,
    );
    await patchRow(clientKey, {
      formation: pick.formation,
      play_name: pick.play_name,
      coaching_note: meta.coaching_note,
      counter_formation: meta.counter_formation,
      counter_play: meta.counter_play,
    });
  };

  if (!activeSituation) {
    return (
      <div className="px-4 py-12 text-center font-mono text-sm text-[var(--chalk-muted)]">
        Tap a situation above.
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="px-4 py-12 text-center font-mono text-sm text-[var(--chalk-muted)]">
        No plays for {activeSituation} on this sheet.
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-28 pt-4">
      {visible.map((row) => (
        <div
          key={row.clientKey}
          className={`rounded-xl border-2 px-4 py-5 ${
            row.is_used
              ? "border-white/10 bg-black/25 opacity-45"
              : row.is_featured
                ? "border-[var(--amber)] bg-black/45 shadow-[0_0_0_1px_rgba(244,165,34,0.25)]"
                : "border-white/15 bg-black/40"
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-soft)]">
            {row.formation}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide text-[var(--chalk)]">
            {row.play_name}
          </h2>
          {row.coaching_note ? (
            <p className="mt-3 font-mono text-sm leading-relaxed text-[var(--chalk-soft)]">
              {row.coaching_note}
            </p>
          ) : null}
          {row.custom_note ? (
            <p className="mt-2 font-mono text-xs text-[var(--chalk-muted)]">
              {row.custom_note}
            </p>
          ) : null}
          {row.counter_play ? (
            <p className="mt-3 font-mono text-xs italic text-[var(--chalk-muted)]">
              Counter: {row.counter_play}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void patchRow(row.clientKey, { is_used: !row.is_used })}
              className="rounded border border-white/20 bg-black/50 px-3 py-2 font-mono text-xs text-[var(--chalk)]"
            >
              {row.is_used ? "Mark unused" : "Mark used"}
            </button>
            <button
              type="button"
              onClick={() => setSwapKey(row.clientKey)}
              className="rounded border border-[var(--accent)]/40 px-3 py-2 font-mono text-xs text-[var(--accent-soft)]"
            >
              Swap
            </button>
          </div>
        </div>
      ))}

      <PlaySwapDrawer
        open={Boolean(swapKey)}
        onClose={() => setSwapKey(null)}
        playbook={playbook}
        defensiveScheme={defensiveScheme}
        onSelect={(pick) => {
          if (swapKey) void applySwap(swapKey, pick);
        }}
      />
    </div>
  );
}
