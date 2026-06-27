"use client";

import {
  CALL_SHEET_VIEWER_MENU_BUILDER,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  CALL_SHEET_VIEWER_MENU_VIEW,
} from "@/lib/coachCopy";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { appShellIconBackButtonClass, overlayZ } from "@/lib/constants/designTokens";
import { isPlaySheetBuilderPath, isPlaySheetViewerPath, PLAY_SHEET_VIEWER_PATH } from "@/lib/navigation/playSheetNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItemClass =
  "group flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 font-sans text-[15px] font-medium transition-colors";

const menuItemDefaultClass =
  "border-slate-800 bg-slate-900/50 text-slate-100 hover:border-slate-600 hover:bg-slate-800/60";

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
  const router = useRouter();
  const { signOut } = useAuth();
  const [signOutBusy, setSignOutBusy] = useState(false);
  const onBuilder = isPlaySheetBuilderPath(pathname);
  const onViewer = isPlaySheetViewerPath(pathname);
  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  const menuItems = [
    { href: "/playbook", label: CALL_SHEET_VIEWER_MENU_BUILDER, active: onBuilder },
    { href: PLAY_SHEET_VIEWER_PATH, label: CALL_SHEET_VIEWER_MENU_VIEW, active: onViewer },
    { href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS, active: onSettings },
  ];

  async function handleSignOut() {
    setSignOutBusy(true);
    const { error } = await signOut();
    if (!error) {
      onOpenChange(false);
      router.push("/landing");
    } else {
      setSignOutBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="drawer-left"
        hideCloseButton
        className={cn(
          "w-[min(100%,300px)] max-w-none border-slate-800 bg-slate-950",
          overlayZ.sheetShell,
        )}
        overlayClassName={overlayZ.radixDialog}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))]"
        >
          <DialogTitle className="min-w-0">
            <AppCompactWordmark />
            <span className="sr-only">The Sideline</span>
          </DialogTitle>
          <DialogClose asChild>
            <button type="button" aria-label="Close menu" className={appShellIconBackButtonClass}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </DialogClose>
        </div>

        <DialogDescription className="sr-only">Call sheet navigation</DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-col gap-2 px-4 py-5" aria-label="Call sheet menu">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  menuItemClass,
                  item.active
                    ? "border-emerald-600/45 bg-emerald-950/25 text-emerald-400"
                    : menuItemDefaultClass,
                )}
                aria-current={item.active ? "page" : undefined}
                onClick={() => onOpenChange(false)}
              >
                <span>{item.label}</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    item.active ? "text-emerald-400/80" : "text-slate-500 group-hover:text-slate-400",
                  )}
                  aria-hidden
                />
              </Link>
            ))}
          </nav>

          <div className="shrink-0 border-t border-slate-800/80 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              className={cn(menuItemClass, menuItemDefaultClass, "disabled:opacity-60")}
              disabled={signOutBusy}
              onClick={() => void handleSignOut()}
            >
              {signOutBusy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
