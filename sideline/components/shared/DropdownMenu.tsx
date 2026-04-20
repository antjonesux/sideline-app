"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { closeAllDropdownMenusExcept, registerDropdownMenuCloser } from "@/lib/dropdownMenuRegistry";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
 * Portal dropdown: each instance owns open state. Document mousedown (capture) closes
 * when clicking outside; opening one menu closes others via {@link closeAllDropdownMenusExcept}
 * so stacked drive cards behave predictably (no full-screen overlay blocking other kebabs).
 */
const BOTTOM_UI_RESERVE = 80;

export function DropdownMenu({
  items,
  triggerClassName = "",
  "aria-label": ariaLabel = "Open menu",
  clampMenuBelowSelector,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    return registerDropdownMenuCloser(close);
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [isOpen, close]);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (isOpen) {
      close();
      return;
    }
    closeAllDropdownMenusExcept(close);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const right = window.innerWidth - rect.right;
    const estimatedMenuHeight = Math.min(320, items.length * 48 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const clampEl = clampMenuBelowSelector ? document.querySelector(clampMenuBelowSelector) : null;
    const clampBottom = clampEl instanceof HTMLElement ? clampEl.getBoundingClientRect().bottom : null;
    if (spaceBelow < estimatedMenuHeight + BOTTOM_UI_RESERVE) {
      setPosition({
        bottom: window.innerHeight - rect.top + 4,
        right,
      });
    } else {
      const desiredTop = rect.bottom + 4;
      const minTop = clampBottom != null ? clampBottom + 4 : desiredTop;
      setPosition({
        top: Math.max(desiredTop, minTop),
        right,
      });
    }
    setIsOpen(true);
  }

  return (
    <div className="inline-flex shrink-0 items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={`app-no-press-scale inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${triggerClassName}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[70] max-h-[min(50dvh,20rem)] min-w-[160px] overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
              style={{
                ...(position.top != null ? { top: position.top } : {}),
                ...(position.bottom != null ? { bottom: position.bottom } : {}),
                right: position.right,
              }}
              role="menu"
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick();
                    close();
                  }}
                  className={`flex w-full px-4 py-2.5 text-left font-sans text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500 dark:focus-visible:outline-emerald-500 ${
                    item.destructive
                      ? "text-red-400 hover:bg-slate-700 dark:text-red-400 dark:hover:bg-slate-700"
                      : "text-slate-300 hover:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
