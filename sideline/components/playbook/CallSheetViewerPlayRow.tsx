"use client";

import type { SheetPlayRow } from "@/lib/types";
import { normalizePlayName } from "@/lib/utils";

/** Read-only play row — play name + formation only (Call Sheet viewer). */
export function CallSheetViewerPlayRow({ play }: { play: SheetPlayRow }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-white">{normalizePlayName(play.play_name)}</p>
        <p className="mt-0.5 truncate font-body text-xs text-slate-400 sm:hidden">{play.formation}</p>
      </div>
      <p className="hidden shrink-0 max-w-[45%] truncate text-right font-body text-sm text-slate-400 sm:block">
        {play.formation}
      </p>
    </div>
  );
}
