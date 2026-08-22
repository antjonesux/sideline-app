"use client";

import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Game actions" / "Playbook actions" */
  ariaLabel: string;
  /** `DropdownMenuItem` nodes from `@/components/ui/dropdown-menu`. */
  children: ReactNode;
  /** Film cards use the kebab icon; play sheet cards use a text trigger. */
  trigger?: "icon" | "text";
  /** Visible label when `trigger` is `"text"` (also used for `aria-label` if set). */
  textTriggerLabel?: string;
  /** Optional wrapper positioning — e.g. vertical center on desktop card rows. */
  className?: string;
};

/**
 * Menu trigger + dropdown shell used on Film game cards (kebab) and play sheet cards on the Playbook tab (optional text trigger).
 */
export function CardKebabMenu({
  open,
  onOpenChange,
  ariaLabel,
  children,
  trigger = "icon",
  textTriggerLabel = "More",
  className,
}: Props) {
  const textLabel = textTriggerLabel.trim() || "More";
  return (
    <div className={cn("pointer-events-none absolute right-4 top-4 z-10", className)}>
      <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "pointer-events-auto",
              trigger === "text"
                ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-transparent px-3 font-body text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
                : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100",
            )}
            aria-label={trigger === "text" ? `${ariaLabel}: ${textLabel}` : ariaLabel}
            onClick={(e) => e.stopPropagation()}
          >
            {trigger === "text" ? textLabel : null}
            {trigger === "icon" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          className="min-w-[11rem] border-slate-700 bg-slate-950 p-1 text-slate-200 shadow-lg"
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
