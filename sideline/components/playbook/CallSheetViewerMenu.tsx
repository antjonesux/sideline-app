"use client";

import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import { useAuth } from "@/components/providers/AuthProvider";
import { CALL_SHEET_VIEWER_MENU_REVIEW_SOON } from "@/lib/coachCopy";
import { appShellIconBackButtonClass, overlayZ } from "@/lib/constants/designTokens";
import {
  APP_SHELL_SIGN_OUT_LABEL,
  getAppShellSidebarNav,
  isAppShellSidebarNavActive,
} from "@/lib/navigation/appShellNav";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItemClass =
  "group flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 font-sans text-[15px] font-medium transition-colors";

const menuItemDefaultClass =
  "border-slate-800 bg-slate-900/50 text-slate-100 hover:border-slate-600 hover:bg-slate-800/60";

export function CallSheetMenuButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Open menu"
      className={cn(appShellIconBackButtonClass, className)}
      onClick={onClick}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

export function CallSheetViewerMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signOutBusy, setSignOutBusy] = useState(false);

  const sidebarNav = getAppShellSidebarNav(user?.id);
  const discordItem = sidebarNav.find((item) => item.id === "discord");
  const settingsItem = sidebarNav.find((item) => item.id === "settings");
  const primaryNav = sidebarNav.filter(
    (item) => item.id !== "discord" && item.id !== "settings",
  );
  const settingsActive = settingsItem ? isAppShellSidebarNavActive(pathname, settingsItem) : false;
  const DiscordIcon = discordItem?.icon;

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

        <DialogDescription className="sr-only">Application navigation</DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-col gap-2 px-4 py-5" aria-label="Application menu">
            {primaryNav.map((item) => {
              const active = isAppShellSidebarNavActive(pathname, item);
              const Icon = item.icon;

              const label = (
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </span>
              );

              const row =
                item.comingSoon || !item.href ? (
                  <span
                    className={cn(menuItemClass, menuItemDefaultClass, "cursor-default text-slate-600")}
                    aria-disabled="true"
                  >
                    {label}
                    <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 font-sans text-[10px] font-medium leading-none text-slate-500">
                      {CALL_SHEET_VIEWER_MENU_REVIEW_SOON}
                    </span>
                  </span>
                ) : item.external ? (
                  <a
                    href={item.href}
                    className={cn(menuItemClass, menuItemDefaultClass)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onOpenChange(false)}
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      menuItemClass,
                      active
                        ? "border-emerald-600/45 bg-emerald-950/25 text-emerald-400"
                        : menuItemDefaultClass,
                    )}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onOpenChange(false)}
                  >
                    {label}
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-emerald-400/80" : "text-slate-500 group-hover:text-slate-400",
                      )}
                      aria-hidden
                    />
                  </Link>
                );

              return (
                <div key={item.id} className="flex flex-col gap-2">
                  {row}
                  {item.separatorAfter ? (
                    <div className="my-1 border-b border-slate-800" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto shrink-0 border-t border-slate-800/80 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-2">
            {discordItem?.href && discordItem.external && DiscordIcon ? (
              <a
                href={discordItem.href}
                className={cn(menuItemClass, menuItemDefaultClass)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <DiscordIcon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{discordItem.label}</span>
                </span>
              </a>
            ) : null}
            {settingsItem?.href ? (
              <Link
                href={settingsItem.href}
                className={cn(
                  menuItemClass,
                  settingsActive
                    ? "border-emerald-600/45 bg-emerald-950/25 text-emerald-400"
                    : menuItemDefaultClass,
                )}
                aria-current={settingsActive ? "page" : undefined}
                onClick={() => onOpenChange(false)}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Settings className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{settingsItem.label}</span>
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    settingsActive ? "text-emerald-400/80" : "text-slate-500 group-hover:text-slate-400",
                  )}
                  aria-hidden
                />
              </Link>
            ) : null}
            <button
              type="button"
              className={cn(menuItemClass, menuItemDefaultClass, "disabled:opacity-60")}
              disabled={signOutBusy}
              onClick={() => void handleSignOut()}
            >
              {signOutBusy ? "Signing out…" : APP_SHELL_SIGN_OUT_LABEL}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
