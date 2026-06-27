"use client";

import {
  COULDNT_SAVE,
  CALL_SHEET_VIEWER_SWITCHER_TITLE,
  PLAY_SHEET_SET_ACTIVE_DONE,
} from "@/lib/coachCopy";
import { PlaySheetActiveBadge } from "@/components/playbook/PlaySheetActiveBadge";
import { BottomSheet } from "@/components/shared/BottomSheet";
import type { PlaybookSummary } from "@/lib/types";
import { useToastStore } from "@/store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function CallSheetSheetSwitcher({
  open,
  onOpenChange,
  sheets,
  activeSheetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheets: PlaybookSummary[];
  activeSheetId: string | null;
}) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function selectSheet(sheetId: string) {
    if (sheetId === activeSheetId) {
      onOpenChange(false);
      return;
    }
    setBusyId(sheetId);
    try {
      const res = await fetch("/api/playbook/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_sheet_id: sheetId }),
      });
      if (!res.ok) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      addToast(PLAY_SHEET_SET_ACTIVE_DONE, "success");
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
      onOpenChange(false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={CALL_SHEET_VIEWER_SWITCHER_TITLE}
      description="Choose which play sheet to reference"
      contentClassName="p-0 sm:p-0"
    >
      <ul className="divide-y divide-slate-800" role="listbox" aria-label="Play sheets">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const busy = busyId === sheet.id;
          return (
            <li key={sheet.id}>
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={busy || busyId !== null}
                className="flex min-h-14 w-full flex-col items-start gap-1 px-4 py-3.5 text-start transition-colors hover:bg-slate-800/60 disabled:opacity-60"
                onClick={() => void selectSheet(sheet.id)}
              >
                <span className="flex w-full min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-sans text-sm font-medium text-slate-200">{sheet.name}</span>
                  {isActive ? <PlaySheetActiveBadge /> : null}
                </span>
                <span className="font-body text-sm text-slate-500">{sheet.cfb26_playbook}</span>
                <span className="font-body text-xs text-slate-500">
                  {sheet.play_count === 1 ? "1 play" : `${sheet.play_count} plays`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
