"use client";

import { FormationView } from "@/components/FormationView";
import { ScreenshotMode } from "@/components/ScreenshotMode";
import { SituationView } from "@/components/SituationView";
import type { DraftPlayRow } from "@/lib/playSheetTypes";
import type { SheetViewMode } from "@/store/gameStore";
import { useState } from "react";

export function PlaySheetView({
  rows,
  sheetViewMode,
  onSheetViewMode,
  title,
  showChrome = true,
}: {
  rows: DraftPlayRow[];
  sheetViewMode: SheetViewMode;
  onSheetViewMode: (m: SheetViewMode) => void;
  title?: string;
  showChrome?: boolean;
}) {
  const [shot, setShot] = useState(false);

  return (
    <>
      {showChrome ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h1 className="font-display text-2xl text-[var(--chalk)]">{title}</h1>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded border border-white/15 font-mono text-[10px] uppercase tracking-wider">
              <button
                type="button"
                onClick={() => onSheetViewMode("situation")}
                className={`px-3 py-2 ${
                  sheetViewMode === "situation"
                    ? "bg-[var(--accent)]/25 text-[var(--chalk)]"
                    : "text-[var(--chalk-muted)]"
                }`}
              >
                Situation
              </button>
              <button
                type="button"
                onClick={() => onSheetViewMode("formation")}
                className={`px-3 py-2 ${
                  sheetViewMode === "formation"
                    ? "bg-[var(--accent)]/25 text-[var(--chalk)]"
                    : "text-[var(--chalk-muted)]"
                }`}
              >
                Formation
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShot(true)}
              className="rounded border border-white/15 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)] hover:border-white/25"
            >
              Screenshot mode
            </button>
          </div>
        </div>
      ) : null}

      {sheetViewMode === "situation" ? (
        <SituationView rows={rows} />
      ) : (
        <FormationView rows={rows} />
      )}

      {shot ? (
        <ScreenshotMode
          rows={rows}
          view={sheetViewMode}
          onExit={() => setShot(false)}
        />
      ) : null}
    </>
  );
}
