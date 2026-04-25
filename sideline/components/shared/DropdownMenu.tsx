"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { closeAllDropdownMenusExcept, registerDropdownMenuCloser } from "@/lib/dropdownMenuRegistry";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  DropdownMenu as ShadDropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem as ShadDropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type Props = {
  items: DropdownMenuItem[];
  /** Extra classes on the trigger button (icon). */
  triggerClassName?: string;
  "aria-label"?: string;
  /**
   * When set, menu `top` is at least `getBoundingClientRect().bottom + 4` of the first matching
   * element (e.g. sticky game header) so the portal menu clears fixed/sticky chrome.
   */
  clampMenuBelowSelector?: string;
};

/**
 * Drive-row kebab menu: Radix portal + stacking. Opening one menu closes others via
 * {@link closeAllDropdownMenusExcept} so stacked drive cards behave predictably.
 */
const DEFAULT_SIDE_OFFSET = 4;

function computeClampSideOffset(triggerEl: HTMLElement | null, clampSelector: string | undefined): number {
  if (!triggerEl || !clampSelector?.trim()) return DEFAULT_SIDE_OFFSET;
  const bar = document.querySelector(clampSelector.trim());
  if (!bar) return DEFAULT_SIDE_OFFSET;
  const barRect = bar.getBoundingClientRect();
  const trRect = triggerEl.getBoundingClientRect();
  const minMenuTop = barRect.bottom + 4;
  const need = Math.ceil(minMenuTop - trRect.bottom);
  return Math.max(DEFAULT_SIDE_OFFSET, need);
}

export function DropdownMenu({
  items,
  triggerClassName = "",
  "aria-label": ariaLabel = "Open menu",
  clampMenuBelowSelector,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sideOffset, setSideOffset] = useState(DEFAULT_SIDE_OFFSET);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const recomputeSideOffset = useCallback(() => {
    setSideOffset(computeClampSideOffset(triggerRef.current, clampMenuBelowSelector));
  }, [clampMenuBelowSelector]);

  useLayoutEffect(() => {
    if (!open) {
      setSideOffset(DEFAULT_SIDE_OFFSET);
      return;
    }
    recomputeSideOffset();
  }, [open, recomputeSideOffset]);

  useEffect(() => {
    if (!open || !clampMenuBelowSelector?.trim()) return;
    let rafId = 0;
    const scheduleRecompute = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        recomputeSideOffset();
      });
    };
    const scrollOpts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("scroll", scheduleRecompute, scrollOpts);
    window.addEventListener("resize", scheduleRecompute);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleRecompute, scrollOpts);
      window.removeEventListener("resize", scheduleRecompute);
    };
  }, [open, clampMenuBelowSelector, recomputeSideOffset]);

  useEffect(() => {
    return registerDropdownMenuCloser(close);
  }, [close]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      closeAllDropdownMenusExcept(close);
    }
    setOpen(next);
  };

  return (
    <div className="inline-flex shrink-0 items-center">
      <ShadDropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            data-no-press
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
              triggerClassName,
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={sideOffset}
          collisionPadding={{ bottom: 80 }}
          className="min-w-[160px] border-slate-700 bg-slate-800 p-1 text-slate-300 shadow-xl"
        >
          {items.map((item, i) => (
            <ShadDropdownMenuItem
              key={i}
              className={cn(
                "min-h-11 cursor-pointer px-4 py-2.5 font-sans text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500 dark:focus-visible:outline-emerald-500",
                item.destructive
                  ? "text-red-400 focus:bg-slate-700 focus:text-red-400 dark:text-red-400 dark:focus:bg-slate-700"
                  : "text-slate-300 focus:bg-slate-700 focus:text-slate-300 dark:text-slate-300 dark:focus:bg-slate-700",
              )}
              onSelect={() => {
                item.onClick();
              }}
            >
              {item.label}
            </ShadDropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </ShadDropdownMenu>
    </div>
  );
}
