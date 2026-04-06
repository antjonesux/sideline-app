"use client";

import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { PLAY_SHEET_SITUATIONS } from "@/lib/playSheetSituations";
import { useMemo } from "react";

type View = "situation" | "formation";

function sortRows(list: DraftPlayRow[]) {
  return [...list].sort((a, b) => {
    const so = (a.situation_order ?? 0) - (b.situation_order ?? 0);
    if (so !== 0) return so;
    return (a.play_order ?? 0) - (b.play_order ?? 0);
  });
}

export function ScreenshotMode({
  rows,
  view,
  onExit,
}: {
  rows: DraftPlayRow[];
  view: View;
  onExit: () => void;
}) {
  const cells = useMemo(() => {
    const sorted = sortRows(rows);
    if (view === "situation") {
      const out: { title: string; row: DraftPlayRow }[] = [];
      for (const sit of PLAY_SHEET_SITUATIONS) {
        for (const r of sorted.filter((x) => x.situation === sit)) {
          out.push({ title: sit, row: r });
        }
      }
      return out;
    }
    const byF = new Map<string, DraftPlayRow[]>();
    for (const r of sorted) {
      if (!byF.has(r.formation)) byF.set(r.formation, []);
      byF.get(r.formation)!.push(r);
    }
    const out: { title: string; sub: string; row: DraftPlayRow }[] = [];
    for (const [f, list] of Array.from(byF.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      for (const r of list) {
        out.push({
          title: f,
          sub: r.situation,
          row: r,
        });
      }
    }
    return out;
  }, [rows, view]);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-neutral-200">
      <div className="mx-auto min-h-full max-w-[390px] bg-white px-3 py-4 text-black shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-black/10 pb-2">
          <span className="font-display text-sm font-bold uppercase tracking-wider">
            {view === "situation" ? "By situation" : "By formation"}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="font-mono text-[10px] uppercase text-black/60 underline"
          >
            Exit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {view === "situation"
            ? (cells as { title: string; row: DraftPlayRow }[]).map(
                ({ title, row }) => (
                  <article
                    key={`${row.clientKey}-${title}`}
                    className="break-words border-b border-black/5 pb-3"
                  >
                    <p className="text-[9px] font-bold uppercase leading-tight text-black/70">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold leading-tight text-green-800">
                      {row.formation}
                    </p>
                    <p
                      className={`mt-1 text-[11px] font-semibold leading-snug ${
                        row.is_featured ? "font-extrabold" : ""
                      }`}
                    >
                      {row.play_name}
                    </p>
                    {row.coaching_note ? (
                      <p className="mt-1 text-[9px] leading-snug text-black/85">
                        {row.coaching_note}
                      </p>
                    ) : null}
                    {row.counter_play ? (
                      <p className="mt-1 text-[8px] italic leading-snug text-black/65">
                        Counter: {row.counter_play}
                      </p>
                    ) : null}
                  </article>
                ),
              )
            : (cells as { title: string; sub: string; row: DraftPlayRow }[]).map(
                ({ title, sub, row }) => (
                  <article
                    key={`${row.clientKey}-f`}
                    className="break-words border-b border-black/5 pb-3"
                  >
                    <p className="text-[10px] font-semibold leading-tight text-green-800">
                      {title}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-black/60">
                      {sub}
                    </p>
                    <p
                      className={`mt-1 text-[11px] font-semibold leading-snug ${
                        row.is_featured ? "font-extrabold" : ""
                      }`}
                    >
                      {row.play_name}
                    </p>
                    {row.counter_play ? (
                      <p className="mt-1 text-[8px] italic text-black/65">
                        Counter: {row.counter_play}
                      </p>
                    ) : null}
                  </article>
                ),
              )}
        </div>
        <p className="mt-6 text-right text-[8px] text-black/35">The Sideline</p>
      </div>
    </div>
  );
}
