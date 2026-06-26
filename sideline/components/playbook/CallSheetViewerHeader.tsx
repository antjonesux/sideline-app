"use client";

import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import { CallSheetSheetSwitcher } from "@/components/playbook/CallSheetSheetSwitcher";
import type { PlaybookSummary } from "@/lib/types";
import { useState } from "react";

export function CallSheetViewerHeader({
  sheetName,
  sheets,
  activeSheetId,
}: {
  sheetName: string;
  sheets: PlaybookSummary[];
  activeSheetId: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <>
      <header className="flex items-center gap-2">
        <CallSheetMenuButton onClick={() => setMenuOpen(true)} />

        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center transition-colors hover:bg-slate-900/80"
          onClick={() => setSwitcherOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={switcherOpen}
        >
          <span className="truncate font-sans text-lg font-semibold text-white">{sheetName}</span>
          <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </header>

      <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <CallSheetSheetSwitcher
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
        sheets={sheets}
        activeSheetId={activeSheetId}
      />
    </>
  );
}
