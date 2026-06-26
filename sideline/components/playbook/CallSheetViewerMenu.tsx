"use client";

import {
  CALL_SHEET_VIEWER_MENU_BUILDER,
  CALL_SHEET_VIEWER_MENU_INSIGHTS,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  CALL_SHEET_VIEWER_MENU_VIEW,
} from "@/lib/coachCopy";
import { appShellIconBackButtonClass, overlayZ } from "@/lib/constants/designTokens";
import { isPlaySheetBuilderPath, isPlaySheetViewerPath, PLAY_SHEET_VIEWER_PATH } from "@/lib/navigation/playSheetNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItemClass =
  "flex min-h-12 w-full items-center rounded-lg px-3 font-sans text-base text-slate-100 transition-colors hover:bg-slate-800";

export function CallSheetMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Open menu" className={appShellIconBackButtonClass} onClick={onClick}>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

export function CallSheetViewerMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const onBuilder = isPlaySheetBuilderPath(pathname);
  const onViewer = isPlaySheetViewerPath(pathname);
  const onInsights =
    pathname === "/film" ||
    pathname.startsWith("/film/") ||
    pathname === "/tendencies" ||
    pathname.startsWith("/tendencies/");
  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={`fixed inset-y-0 left-0 top-0 h-[100dvh] max-h-[100dvh] w-[min(100%,280px)] max-w-none translate-x-0 translate-y-0 rounded-none border-0 border-r border-slate-800 bg-slate-950 p-0 shadow-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none ${overlayZ.sheetShell}`}
        overlayClassName={overlayZ.radixDialog}
      >
        <DialogHeader className="border-b border-slate-800 px-4 py-4 text-left">
          <DialogTitle className="font-heading text-lg font-bold uppercase tracking-wide text-white">Menu</DialogTitle>
          <DialogDescription className="sr-only">Call sheet navigation</DialogDescription>
        </DialogHeader>
        <nav className="flex flex-col gap-1 p-3" aria-label="Call sheet menu">
          <Link
            href="/playbook"
            className={`${menuItemClass} ${onBuilder ? "bg-slate-800 text-emerald-400" : ""}`}
            aria-current={onBuilder ? "page" : undefined}
            onClick={() => onOpenChange(false)}
          >
            {CALL_SHEET_VIEWER_MENU_BUILDER}
          </Link>
          <Link
            href={PLAY_SHEET_VIEWER_PATH}
            className={`${menuItemClass} ${onViewer ? "bg-slate-800 text-emerald-400" : ""}`}
            aria-current={onViewer ? "page" : undefined}
            onClick={() => onOpenChange(false)}
          >
            {CALL_SHEET_VIEWER_MENU_VIEW}
          </Link>
          <Link
            href="/film"
            className={`${menuItemClass} ${onInsights ? "bg-slate-800 text-emerald-400" : ""}`}
            aria-current={onInsights ? "page" : undefined}
            onClick={() => onOpenChange(false)}
          >
            {CALL_SHEET_VIEWER_MENU_INSIGHTS}
          </Link>
          <Link
            href="/settings"
            className={`${menuItemClass} ${onSettings ? "bg-slate-800 text-emerald-400" : ""}`}
            aria-current={onSettings ? "page" : undefined}
            onClick={() => onOpenChange(false)}
          >
            {CALL_SHEET_VIEWER_MENU_SETTINGS}
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
