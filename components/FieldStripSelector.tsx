"use client";

import type { FieldZone } from "@/lib/mvp4Types";

const ZONES: {
  zone: FieldZone;
  emoji: string;
  title: string;
  yards: string;
  barClass: string;
}[] = [
  {
    zone: "GOAL_LINE",
    emoji: "🔴",
    title: "GOAL LINE",
    yards: "opp 1–5",
    barClass: "bg-red-600",
  },
  {
    zone: "RED_ZONE",
    emoji: "🟠",
    title: "RED ZONE",
    yards: "opp 6–20",
    barClass: "bg-orange-600",
  },
  {
    zone: "SCORING",
    emoji: "🟡",
    title: "SCORING",
    yards: "opp 21–39",
    barClass: "bg-yellow-500",
  },
  {
    zone: "MIDFIELD",
    emoji: "🟢",
    title: "MIDFIELD",
    yards: "40s both",
    barClass: "bg-emerald-600",
  },
  {
    zone: "OWN_TERRITORY",
    emoji: "🔵",
    title: "OWN TERR",
    yards: "own 11–39",
    barClass: "bg-sky-600",
  },
  {
    zone: "BACKED_UP",
    emoji: "⚫",
    title: "BACKED UP",
    yards: "own 1–10",
    barClass: "bg-zinc-800",
  },
];

export function FieldStripSelector({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: FieldZone;
  onClose: () => void;
  onSelect: (z: FieldZone) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70">
      <button
        type="button"
        className="min-h-[20vh] w-full cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="max-h-[85vh] overflow-hidden rounded-t-2xl border border-white/15 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--chalk-muted)]">
            Field position — tap zone
          </p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[var(--accent-soft)]"
          >
            Close
          </button>
        </div>
        <div className="flex max-h-[min(72vh,640px)] flex-col">
          {ZONES.map((z) => {
            const on = z.zone === current;
            return (
              <button
                key={z.zone}
                type="button"
                onClick={() => {
                  onSelect(z.zone);
                  onClose();
                }}
                className={`flex min-h-[52px] items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition md:min-h-[56px] ${
                  on
                    ? "bg-white/10 ring-2 ring-inset ring-[var(--amber)]"
                    : "hover:bg-white/5 active:bg-white/10"
                }`}
              >
                <span
                  className={`h-10 w-1.5 shrink-0 rounded-full ${z.barClass}`}
                  aria-hidden
                />
                <span className="text-lg" aria-hidden>
                  {z.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base tracking-wide text-[var(--chalk)]">
                    {z.title}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--chalk-muted)]">
                    {z.yards}
                  </p>
                </div>
                {on ? (
                  <span className="shrink-0 font-mono text-[10px] uppercase text-[var(--amber-soft)]">
                    Current
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
