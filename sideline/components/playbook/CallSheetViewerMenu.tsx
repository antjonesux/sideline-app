"use client";

import {
  CALL_SHEET_VIEWER_MENU_BUILDER,
  CALL_SHEET_VIEWER_MENU_INSIGHTS,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  CALL_SHEET_VIEWER_MENU_VIEW,
} from "@/lib/coachCopy";
import { overlayZ } from "@/lib/constants/designTokens";
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

export function CallSheetViewerMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();

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
          <Link href="/playbook" className={menuItemClass} onClick={() => onOpenChange(false)}>
            {CALL_SHEET_VIEWER_MENU_BUILDER}
          </Link>
          <Link
            href="/playbook/view"
            className={`${menuItemClass} ${pathname === "/playbook/view" ? "bg-slate-800 text-emerald-400" : ""}`}
            aria-current={pathname === "/playbook/view" ? "page" : undefined}
            onClick={() => onOpenChange(false)}
          >
            {CALL_SHEET_VIEWER_MENU_VIEW}
          </Link>
          <Link href="/film" className={menuItemClass} onClick={() => onOpenChange(false)}>
            {CALL_SHEET_VIEWER_MENU_INSIGHTS}
          </Link>
          <Link href="/settings" className={menuItemClass} onClick={() => onOpenChange(false)}>
            {CALL_SHEET_VIEWER_MENU_SETTINGS}
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
