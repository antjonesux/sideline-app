"use client";

import { CALL_SHEET_MENU_LABEL, CALL_SHEET_VIEWER_MENU_SETTINGS } from "@/lib/coachCopy";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { appShellIconBackButtonClass, overlayZ } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import { ChevronRight, X } from "lucide-react";

const menuItemClass =
  "group flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 font-sans text-[15px] font-medium transition-colors";

const menuItemDefaultClass =
  "border-slate-800 bg-slate-900/50 text-slate-100 hover:border-slate-600 hover:bg-slate-800/60";

/** Static open drawer for screenshot QA — mirrors CallSheetViewerMenu chrome without Radix Dialog. */
export function CallSheetQaMenuDrawer({ activeHref = "/playbook" }: { activeHref?: string }) {
  const menuItems = [
    { href: "/playbook", label: CALL_SHEET_MENU_LABEL },
    { href: "/settings", label: CALL_SHEET_VIEWER_MENU_SETTINGS },
  ];

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/80", overlayZ.radixDialog)} aria-hidden />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 flex h-[100dvh] max-h-[100dvh] w-[min(100%,300px)] max-w-none flex-col border-r border-slate-800 bg-slate-950",
          overlayZ.sheetShell,
        )}
        role="dialog"
        aria-modal
        aria-label="Call sheet navigation"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
          <div className="min-w-0">
            <AppCompactWordmark />
            <span className="sr-only">The Sideline</span>
          </div>
          <button type="button" aria-label="Close menu" className={appShellIconBackButtonClass}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-col gap-2 px-4 py-5" aria-label="Call sheet menu">
            {menuItems.map((item) => {
              const active = item.href === activeHref;
              return (
                <div
                  key={item.href}
                  className={cn(
                    menuItemClass,
                    active
                      ? "border-emerald-600/45 bg-emerald-950/25 text-emerald-400"
                      : menuItemDefaultClass,
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-emerald-400/80" : "text-slate-500 group-hover:text-slate-400",
                    )}
                    aria-hidden
                  />
                </div>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-slate-800/80 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <div className={cn(menuItemClass, menuItemDefaultClass)}>Sign out</div>
          </div>
        </div>
      </aside>
    </>
  );
}
