"use client";

import {
  appShellBrowsePanelSubtitleClass,
  appShellBrowsePanelTitleClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SituationSideRailProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeAriaLabel?: string;
  children: ReactNode;
  className?: string;
};

/** Tablet / desktop situation side rail shell (Call Sheet add-play + Film play logger). */
export function SituationSideRail({
  open,
  title,
  subtitle,
  onClose,
  closeAriaLabel = "Close panel",
  children,
  className,
}: SituationSideRailProps) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        "app-shell-situation-browse-panel sticky top-0 hidden h-dvh max-h-dvh min-h-0 min-w-0 flex-col border-l border-slate-800/80 bg-slate-950 md:flex",
        className,
      )}
      aria-label={title}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950 px-5 py-4">
        <div className="min-w-0">
          <h2 className={cn(appShellBrowsePanelTitleClass, "truncate")}>{title}</h2>
          {subtitle ? (
            <p className={cn(appShellBrowsePanelSubtitleClass, "truncate")}>{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white"
          onClick={onClose}
          aria-label={closeAriaLabel}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
    </aside>
  );
}
