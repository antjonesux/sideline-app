"use client";

import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { PLAY_SHEET_SITUATIONS } from "@/lib/playSheetSituations";
import { useState } from "react";

export function SituationView({
  rows,
  collapsible = true,
  screenshotStyle = false,
}: {
  rows: DraftPlayRow[];
  collapsible?: boolean;
  screenshotStyle?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(PLAY_SHEET_SITUATIONS as unknown as string[]),
  );

  const toggle = (s: string) => {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  };

  return (
    <div className={screenshotStyle ? "space-y-3 text-black" : "space-y-2"}>
      {PLAY_SHEET_SITUATIONS.map((sit) => {
        const block = rows
          .filter((r) => r.situation === sit)
          .sort((a, b) => (a.play_order ?? 0) - (b.play_order ?? 0));
        if (block.length === 0) return null;
        const isOpen = open.has(sit) || !collapsible;
        return (
          <section
            key={sit}
            className={
              screenshotStyle
                ? "border-b border-black/10 pb-3"
                : "rounded-lg border border-white/10 bg-black/20"
            }
          >
            {collapsible && !screenshotStyle ? (
              <button
                type="button"
                onClick={() => toggle(sit)}
                className="flex w-full items-center justify-between px-3 py-2 font-display text-lg tracking-wide text-[var(--chalk)]"
              >
                {sit}
                <span className="font-mono text-xs text-[var(--chalk-muted)]">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            ) : (
              <h3
                className={
                  screenshotStyle
                    ? "font-bold uppercase tracking-wide"
                    : "px-3 py-2 font-display text-lg text-[var(--chalk)]"
                }
              >
                {sit}
              </h3>
            )}
            {isOpen ? (
              <div className={screenshotStyle ? "mt-2 space-y-3" : "space-y-3 px-3 pb-3"}>
                {block.map((r) => (
                  <PlayBlock key={r.clientKey} row={r} screenshotStyle={screenshotStyle} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function PlayBlock({
  row,
  screenshotStyle,
}: {
  row: DraftPlayRow;
  screenshotStyle: boolean;
}) {
  if (screenshotStyle) {
    return (
      <div>
        <p className="text-sm font-bold text-black">
          {row.is_featured ? <strong>{row.play_name}</strong> : row.play_name}
        </p>
        <p className="text-xs font-semibold text-green-800">{row.formation}</p>
        {row.coaching_note ? (
          <p className="mt-1 text-xs leading-snug text-black/90">
            &ldquo;{row.coaching_note}&rdquo;
          </p>
        ) : null}
        {row.custom_note ? (
          <p className="mt-0.5 text-xs text-black/80">Note: {row.custom_note}</p>
        ) : null}
        {row.counter_play ? (
          <p className="mt-1 text-[11px] italic text-black/70">
            Counter: {row.counter_play}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded border border-white/10 bg-black/30 p-3 ${
        row.is_used ? "opacity-45" : ""
      } ${row.is_featured ? "ring-1 ring-[var(--amber)]/35" : ""}`}
    >
      <p className="font-mono text-xs text-[var(--accent-soft)]">{row.formation}</p>
      <p
        className={`font-display text-lg text-[var(--chalk)] ${
          row.is_featured ? "font-bold" : ""
        }`}
      >
        {row.play_name}
      </p>
      {row.coaching_note ? (
        <p className="mt-2 font-mono text-sm text-[var(--chalk-soft)]">
          &ldquo;{row.coaching_note}&rdquo;
        </p>
      ) : null}
      {row.custom_note ? (
        <p className="mt-1 font-mono text-xs text-[var(--chalk-muted)]">
          Note: {row.custom_note}
        </p>
      ) : null}
      {row.counter_play ? (
        <p className="mt-2 font-mono text-xs italic text-[var(--chalk-muted)]">
          Counter: {row.counter_play}
        </p>
      ) : null}
    </div>
  );
}
