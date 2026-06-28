"use client";

import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import { CallSheetSheetSwitcher } from "@/components/playbook/CallSheetSheetSwitcher";
import { CallSheetViewerFullSheet } from "@/components/playbook/CallSheetViewerFullSheet";
import { CallSheetViewerSituation } from "@/components/playbook/CallSheetViewerSituation";
import { Button } from "@/components/ui/button";
import {
  CALL_SHEET_VIEWER_EMPTY_BODY,
  CALL_SHEET_VIEWER_EMPTY_CTA,
  CALL_SHEET_VIEWER_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { appShellPrimaryCtaButtonClass } from "@/lib/constants/designTokens";
import { PLAY_SHEET_VIEWER_PATH } from "@/lib/navigation/playSheetNav";
import {
  playSheetQaEditorScenarios,
  playSheetQaSheetName,
  playSheetQaSummaries,
} from "@/lib/playSheetQaFixture";
import Link from "next/link";
import { CallSheetQaMenuDrawer } from "@/components/qa/call-sheet/CallSheetQaMenuDrawer";
import { useEffect, useState } from "react";

function CallSheetQaHeader({
  initialSwitcherOpen = false,
}: {
  initialSwitcherOpen?: boolean;
}) {
  const activeSheetId = playSheetQaSummaries[0]?.id ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(initialSwitcherOpen);

  useEffect(() => {
    if (initialSwitcherOpen) setSwitcherOpen(true);
  }, [initialSwitcherOpen]);

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
          <span className="truncate font-sans text-lg font-semibold text-white">{playSheetQaSheetName}</span>
          <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </header>

      <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <CallSheetSheetSwitcher
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
        sheets={playSheetQaSummaries}
        activeSheetId={activeSheetId}
      />
    </>
  );
}

export function CallSheetQaHome() {
  return (
    <div className="space-y-4">
      <CallSheetQaHeader />
      <CallSheetViewerFullSheet scenarios={playSheetQaEditorScenarios} />
    </div>
  );
}

export function CallSheetQaEmpty() {
  return (
    <div className="space-y-6">
      <CallSheetQaHeader />
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-2 py-10 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500" aria-hidden>
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h6" />
          </svg>
        </div>
        <p className="font-sans text-base font-medium text-white">{CALL_SHEET_VIEWER_EMPTY_HEADLINE}</p>
        <p className="mt-2 max-w-sm font-sans text-sm text-slate-500">{CALL_SHEET_VIEWER_EMPTY_BODY}</p>
        <Button asChild className={`${appShellPrimaryCtaButtonClass} mt-6 max-w-sm`}>
          <Link href="/playbook">{CALL_SHEET_VIEWER_EMPTY_CTA}</Link>
        </Button>
      </div>
    </div>
  );
}

export function CallSheetQaMenu() {
  return (
    <>
      <CallSheetQaHome />
      <CallSheetQaMenuDrawer activeHref={PLAY_SHEET_VIEWER_PATH} />
    </>
  );
}

export function CallSheetQaSwitcher() {
  return (
    <div className="space-y-4">
      <CallSheetQaHeader initialSwitcherOpen />
      <CallSheetViewerFullSheet scenarios={playSheetQaEditorScenarios} />
    </div>
  );
}

export function CallSheetQaRunGameSituation() {
  return (
    <CallSheetViewerSituation
      backHref={PLAY_SHEET_VIEWER_PATH}
      activeScenario="Run Game"
      scenarios={playSheetQaEditorScenarios}
    />
  );
}
