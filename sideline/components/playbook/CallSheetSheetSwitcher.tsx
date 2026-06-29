"use client";

import { CALL_SHEET_VIEWER_SWITCHER_TITLE } from "@/lib/coachCopy";
import { BottomSheet } from "@/components/shared/BottomSheet";
import type { PlaybookSummary } from "@/lib/types";

export function CallSheetSheetSwitcher({
  open,
  onOpenChange,
  sheets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheets: PlaybookSummary[];
}) {
  return (
    <BottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={CALL_SHEET_VIEWER_SWITCHER_TITLE}
      description="Choose which play sheet to reference"
      contentClassName="p-0 sm:p-0"
    >
      <ul className="divide-y divide-slate-800" role="listbox" aria-label="Play sheets">
        {sheets.map((sheet) => (
          <li key={sheet.id}>
            <button
              type="button"
              role="option"
              className="flex min-h-14 w-full flex-col items-start gap-1 px-4 py-3.5 text-start transition-colors hover:bg-slate-800/60"
              onClick={() => onOpenChange(false)}
            >
              <span className="flex w-full min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-sans text-sm font-medium text-slate-200">{sheet.name}</span>
              </span>
              <span className="font-body text-sm text-slate-500">{sheet.cfb26_playbook}</span>
              <span className="font-body text-xs text-slate-500">
                {sheet.play_count === 1 ? "1 play" : `${sheet.play_count} plays`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
