"use client";

import {
  COULDNT_SAVE,
  CALL_SHEET_VIEWER_SWITCHER_TITLE,
  PLAY_SHEET_ACTIVE_BADGE,
  PLAY_SHEET_SET_ACTIVE_DONE,
} from "@/lib/coachCopy";
import { overlayZ } from "@/lib/constants/designTokens";
import type { PlaybookSummary } from "@/lib/types";
import { useToastStore } from "@/store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[85dvh] overflow-hidden border-slate-800 bg-slate-950 p-0 sm:max-w-md ${overlayZ.sheetShell}`}
        overlayClassName={overlayZ.radixDialog}
      >
        <DialogHeader className="border-b border-slate-800 px-4 py-4 text-left">
          <DialogTitle className="font-heading text-lg font-bold uppercase tracking-wide text-white">
            {CALL_SHEET_VIEWER_SWITCHER_TITLE}
          </DialogTitle>
          <DialogDescription className="sr-only">Choose which play sheet to reference</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[min(60dvh,28rem)] overflow-y-auto p-2" role="listbox" aria-label="Play sheets">
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
                  className="flex min-h-14 w-full flex-col items-start gap-1 rounded-lg px-3 py-3 text-start transition-colors hover:bg-slate-800/80 disabled:opacity-60"
                  onClick={() => void selectSheet(sheet.id)}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate font-sans text-base font-semibold text-white">{sheet.name}</span>
                    {isActive ? (
                      <span className="shrink-0 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        {PLAY_SHEET_ACTIVE_BADGE}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-body text-sm text-slate-500">{sheet.cfb26_playbook}</span>
                  <span className="font-body text-xs text-slate-600">
                    {sheet.play_count === 1 ? "1 play" : `${sheet.play_count} plays`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
