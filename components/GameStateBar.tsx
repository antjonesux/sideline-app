"use client";

import {
  distanceLabel,
  downLabel,
  fieldZoneLabel,
  scoreContextShortLabel,
} from "@/lib/gameStateMapping";
import type { LiveGameState } from "@/lib/mvp4Types";

function coveragePillLabel(tags: string[]): string {
  if (!tags.length) return "COVER ▾";
  const t = tags[0].toUpperCase();
  if (tags.length === 1) return `${t} ▾`;
  return `${t} +${tags.length - 1} ▾`;
}

export function GameStateBar({
  gs,
  onOpenField,
  onOpenScore,
  onOpenCoverage,
  onCycleDown,
  onCycleDistance,
  onCycleQuarter,
  onToggleTwoMinute,
}: {
  gs: LiveGameState;
  onOpenField: () => void;
  onOpenScore: () => void;
  onOpenCoverage: () => void;
  onCycleDown: () => void;
  onCycleDistance: () => void;
  onCycleQuarter: () => void;
  onToggleTwoMinute: () => void;
}) {
  const qLabel = gs.quarter === "OT" ? "OT" : `Q${gs.quarter}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-black/50 px-2 py-2 backdrop-blur">
      <button
        type="button"
        onClick={onOpenField}
        className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--chalk)] active:border-[var(--amber)]/60 md:text-[11px]"
      >
        {fieldZoneLabel(gs.fieldZone)}
      </button>
      <button
        type="button"
        onClick={onCycleDown}
        className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--chalk)] active:border-[var(--amber)]/60 md:text-[11px]"
      >
        {downLabel(gs.down)}
      </button>
      <button
        type="button"
        onClick={onCycleDistance}
        className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--chalk)] active:border-[var(--amber)]/60 md:text-[11px]"
      >
        {distanceLabel(gs.distanceBucket)}
      </button>
      <button
        type="button"
        onClick={onOpenScore}
        className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--amber-soft)] active:border-[var(--amber)]/60 md:text-[11px]"
      >
        {scoreContextShortLabel(gs.scoreContext)}
      </button>
      <button
        type="button"
        onClick={onCycleQuarter}
        className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--chalk)] active:border-[var(--amber)]/60 md:text-[11px]"
      >
        {qLabel}
      </button>
      <button
        type="button"
        onClick={onOpenCoverage}
        className="max-w-[140px] truncate rounded-full border border-[var(--accent)]/35 bg-black/60 px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[var(--accent-soft)] active:border-[var(--amber)]/60 md:max-w-[200px] md:text-[11px]"
      >
        {coveragePillLabel(gs.coverageTags)}
      </button>
      <button
        type="button"
        onClick={onToggleTwoMinute}
        className={`rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide md:text-[11px] ${
          gs.twoMinuteDrill
            ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--chalk)]"
            : "border-white/15 bg-black/40 text-[var(--chalk-muted)]"
        }`}
      >
        2MIN
      </button>
    </div>
  );
}

export function ScoreContextDrawer({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: LiveGameState["scoreContext"];
  onClose: () => void;
  onSelect: (c: LiveGameState["scoreContext"]) => void;
}) {
  if (!open) return null;

  const opts: { v: LiveGameState["scoreContext"]; label: string }[] = [
    { v: "UP_BIG", label: "Up big (+14+)" },
    { v: "UP", label: "Up (7–13)" },
    { v: "CLOSE", label: "Close (0–6)" },
    { v: "DOWN", label: "Down (7–13)" },
    { v: "DOWN_BIG", label: "Down big (14+)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70">
      <button
        type="button"
        className="min-h-[25vh] w-full"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="rounded-t-2xl border border-white/15 bg-[#0a0a0a] px-4 pb-8 pt-4">
        <p className="font-mono text-xs uppercase text-[var(--chalk-muted)]">
          Score context
        </p>
        <div className="mt-3 grid gap-2">
          {opts.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => {
                onSelect(o.v);
                onClose();
              }}
              className={`rounded-lg border px-4 py-3 text-left font-mono text-sm ${
                current === o.v
                  ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--chalk)]"
                  : "border-white/15 bg-black/40 text-[var(--chalk-soft)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
