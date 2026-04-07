"use client";

import { PlaySwapDrawer } from "@/components/PlaySwapDrawer";
import {
  distanceLabel,
  downLabel,
  fieldZoneLabel,
  scoreContextShortLabel,
  situationFromGameState,
} from "@/lib/gameStateMapping";
import type { EnginePlay, LiveGameState, Recommendation } from "@/lib/mvp4Types";
import { suggestCoachingAndCounter } from "@/lib/suggestPlayMetadata";
import { useCallback, useEffect, useMemo, useState } from "react";

export function LiveRecommendationCard({
  rec,
  gs,
  sheetId,
  defensiveScheme,
  playbook,
  onMarkUsed,
  onSwapPlay,
}: {
  rec: Recommendation;
  gs: LiveGameState;
  sheetId: string;
  defensiveScheme: string;
  playbook: string;
  onMarkUsed: (play: EnginePlay) => void;
  onSwapPlay: (play: EnginePlay) => void;
}) {
  const options = useMemo(() => {
    const list: EnginePlay[] = [];
    if (rec.primary) list.push(rec.primary);
    for (const a of rec.alternates) list.push(a);
    return list.slice(0, 3);
  }, [rec.primary, rec.alternates]);

  const [idx, setIdx] = useState(0);

  const coverageKey = gs.coverageTags.join("|");
  useEffect(() => {
    setIdx(0);
  }, [
    rec.primary?.id,
    gs.fieldZone,
    gs.down,
    gs.distanceBucket,
    gs.scoreContext,
    gs.quarter,
    coverageKey,
    gs.twoMinuteDrill,
  ]);

  const current = options[idx] ?? null;
  const [swapOpen, setSwapOpen] = useState(false);

  const q = gs.quarter === "OT" ? "OT" : `Q${gs.quarter}`;
  const headerLine = `${downLabel(gs.down)} & ${distanceLabel(gs.distanceBucket)} · ${fieldZoneLabel(gs.fieldZone)} · ${scoreContextShortLabel(gs.scoreContext)} · ${q}`;

  const applySwap = useCallback(
    async (pick: {
      formation: string;
      play_name: string;
      play_type: string | null;
    }) => {
      if (!current?.id) return;
      const meta = suggestCoachingAndCounter(
        defensiveScheme,
        pick.play_name,
        pick.play_type,
      );
      await fetch(`/api/playsheets/${sheetId}/plays/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation: pick.formation,
          play_name: pick.play_name,
          play_type: pick.play_type,
          coaching_note: meta.coaching_note,
          counter_formation: meta.counter_formation,
          counter_play: meta.counter_play,
        }),
      });
      onSwapPlay({
        ...current,
        formation: pick.formation,
        play_name: pick.play_name,
        play_type: pick.play_type,
        coaching_note: meta.coaching_note,
        counter_play: meta.counter_play,
      });
      setSwapOpen(false);
    },
    [current, defensiveScheme, sheetId, onSwapPlay],
  );

  if (!current) {
    const sit = situationFromGameState(gs);
    return (
      <div className="mx-2 mt-2 rounded-xl border border-white/15 bg-black/40 px-4 py-6">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          No play matches{" "}
          <span className="text-[var(--chalk)]">{sit}</span> on your sheet.
          Adjust game state or add plays in the sheet editor.
        </p>
        {rec.suppressedReasons.length ? (
          <ul className="mt-3 list-inside list-disc font-mono text-[11px] text-[var(--chalk-muted)]">
            {rec.suppressedReasons.slice(0, 5).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-2 mt-2 space-y-2">
      <div className="rounded-xl border-2 border-[var(--amber)]/40 bg-black/50 px-4 py-5 shadow-[0_0_0_1px_rgba(244,165,34,0.2)]">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
          {headerLine}
        </p>
        {current.is_featured ? (
          <p className="mt-2 font-mono text-xs text-[var(--amber-soft)]">★</p>
        ) : null}
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-soft)]">
          {current.formation}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-wide text-[var(--chalk)]">
          {current.play_name}
        </h2>
        {current.coaching_note ? (
          <p className="mt-3 font-mono text-sm leading-relaxed text-[var(--chalk-soft)]">
            &ldquo;{current.coaching_note}&rdquo;
          </p>
        ) : null}
        {current.counter_play ? (
          <p className="mt-3 font-mono text-xs text-[var(--chalk-muted)]">
            If they take it: → {current.counter_play}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMarkUsed(current)}
            className="rounded border border-white/20 bg-black/50 px-3 py-2 font-mono text-xs text-[var(--chalk)]"
          >
            Mark used
          </button>
          <button
            type="button"
            onClick={() => setSwapOpen(true)}
            className="rounded border border-[var(--accent)]/40 px-3 py-2 font-mono text-xs text-[var(--accent-soft)]"
          >
            Swap
          </button>
          {options.length > 1 ? (
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % options.length)}
              className="rounded border border-white/15 px-3 py-2 font-mono text-xs text-[var(--chalk-muted)]"
            >
              Next option ›
            </button>
          ) : null}
        </div>
      </div>

      {rec.fourthDownNote ? (
        <p className="px-1 font-mono text-[11px] text-[var(--amber-soft)]">
          {rec.fourthDownNote}
        </p>
      ) : null}
      {rec.modifierNotes.length ? (
        <ul className="px-1 font-mono text-[11px] text-[var(--chalk-muted)]">
          {rec.modifierNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}
      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
          Rule note
        </p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-[var(--chalk-soft)]">
          {rec.ruleNote}
        </p>
      </div>

      <PlaySwapDrawer
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        playbook={playbook}
        defensiveScheme={defensiveScheme}
        onSelect={(pick) => void applySwap(pick)}
      />
    </div>
  );
}
