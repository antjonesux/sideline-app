"use client";

import type { SheetPlayRow } from "@/lib/types";
import { callSheetPlayDisplayLabel } from "@/lib/playbookUtils";

/** Read-only play row — formation + play name (Call Sheet Coach View). */
export function CallSheetViewerPlayRow({ play }: { play: SheetPlayRow }) {
  return (
    <div className="flex min-h-9 items-center border-b border-slate-700/50 py-2 last:border-b-0">
      <p className="min-w-0 truncate font-body text-xs text-slate-500">
        {callSheetPlayDisplayLabel(play.formation, play.play_name)}
      </p>
    </div>
  );
}
