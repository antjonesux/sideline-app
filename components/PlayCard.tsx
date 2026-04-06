"use client";

import type { DraftPlayRow } from "@/lib/playSheetTypes";

export function PlayCard({
  row,
  defensiveScheme,
  onSwap,
  onToggleFeatured,
  onCustomNoteChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
  showUsedDim,
}: {
  row: DraftPlayRow;
  defensiveScheme: string;
  onSwap: () => void;
  onToggleFeatured: () => void;
  onCustomNoteChange: (note: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  showUsedDim?: boolean;
}) {
  const used = showUsedDim && row.is_used;

  return (
    <div
      className={`rounded-lg border border-white/15 bg-black/35 p-4 transition ${
        used ? "opacity-45" : ""
      } ${row.is_featured ? "ring-1 ring-[var(--amber)]/40" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            {row.situation}
            {row.play_order != null && row.play_order > 0 ? " · Alt" : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--accent-soft)]">
            {row.formation}
          </p>
          <h3 className="font-display text-xl tracking-wide text-[var(--chalk)]">
            {row.play_name}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={onToggleFeatured}
            className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
              row.is_featured
                ? "border-[var(--amber)] text-[var(--amber-soft)]"
                : "border-white/15 text-[var(--chalk-muted)]"
            }`}
            aria-pressed={row.is_featured}
          >
            ★ Featured
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--accent-soft)]"
          >
            Swap
          </button>
        </div>
      </div>
      {row.coaching_note ? (
        <p className="mt-3 font-mono text-sm leading-relaxed text-[var(--chalk-soft)]">
          <span className="text-[var(--chalk)]">Why · </span>
          {row.coaching_note}
        </p>
      ) : null}
      {row.counter_play ? (
        <p className="mt-2 font-mono text-xs italic text-[var(--chalk-muted)]">
          Counter: {row.counter_play}
        </p>
      ) : null}
      <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
        Custom note (max 100)
        <input
          type="text"
          maxLength={100}
          value={row.custom_note ?? ""}
          onChange={(e) => onCustomNoteChange(e.target.value)}
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-sm text-[var(--chalk)]"
          placeholder={`vs ${defensiveScheme}…`}
        />
      </label>
      {(onMoveUp || onMoveDown || (canRemove && onRemove)) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onMoveUp ? (
            <button
              type="button"
              onClick={onMoveUp}
              className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-[var(--chalk-muted)]"
            >
              ↑
            </button>
          ) : null}
          {onMoveDown ? (
            <button
              type="button"
              onClick={onMoveDown}
              className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-[var(--chalk-muted)]"
            >
              ↓
            </button>
          ) : null}
          {canRemove && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded border border-red-500/30 px-2 py-1 font-mono text-[10px] text-red-300/90"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
