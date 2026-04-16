"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Game actions" / "Playbook actions" */
  ariaLabel: string;
  /** `<li>` children only (wrapped in `<ul role="menu">`). */
  children: ReactNode;
  /** Film cards use the kebab icon; play sheet cards use a text trigger. */
  trigger?: "icon" | "text";
  /** Visible label when `trigger` is `"text"` (also used for `aria-label` if set). */
  textTriggerLabel?: string;
};

/**
 * Menu trigger + dropdown shell used on Film game cards (kebab) and play sheet cards on the Playbook tab (optional text trigger).
 */
export function CardKebabMenu({ open, onOpenChange, ariaLabel, children, trigger = "icon", textTriggerLabel = "More" }: Props) {
  const textLabel = textTriggerLabel.trim() || "More";
  return (
    <div className="absolute right-4 top-4 z-10">
      <div className="relative">
        <button
          type="button"
          className={
            trigger === "text"
              ? "inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-3 font-body text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
              : "inline-flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
          }
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={trigger === "text" ? `${ariaLabel}: ${textLabel}` : ariaLabel}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(!open);
          }}
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
        {open ? (
          <ul
            className="app-dropdown-panel absolute right-0 z-20 mt-1 min-w-[11rem] py-1"
            role="menu"
          >
            {children}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
