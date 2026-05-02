"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PortalMenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
};

/**
 * Horizontal placement: start-aligned with the trigger (`left === rect.left`) when the panel fits;
 * if it would extend past the viewport, end-align to the trigger (`left ≈ rect.right - width`) so it
 * stays visually anchored to the control (playbook pill on the right edge of the row, etc.).
 */
function horizontalLeftForPanel(rect: DOMRect, widthGuess: number, vw: number, pad: number): number {
  const w = Math.min(widthGuess, vw - 2 * pad);
  let left = rect.left;
  if (left + w > vw - pad) {
    left = rect.right - w;
  }
  return Math.max(pad, Math.min(left, vw - pad - w));
}

/**
 * Shared portal dropdown behavior matching `DropdownMenu` in `components/shared/`:
 * fixed positioning from trigger rect, capture-phase outside-click, scroll-close,
 * Escape-close, resize-close.
 */
export function usePortalDropdown(
  rootRef: { readonly current: HTMLElement | null },
  triggerRef: { readonly current: HTMLElement | null },
) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<PortalMenuPos>({ left: 0, minWidth: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const computePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 8;
    const vw = window.innerWidth;
    /** Upper bound for tendencies listboxes (`max-w-[20rem]`). */
    const maxPanelPx = Math.min(320, vw - 2 * pad);
    const widthGuess = Math.max(rect.width, maxPanelPx);
    const left = horizontalLeftForPanel(rect, widthGuess, vw, pad);

    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuPos(
      spaceBelow < 220
        ? { bottom: window.innerHeight - rect.top + 4, left, minWidth: rect.width }
        : { top: rect.bottom + 4, left, minWidth: rect.width },
    );
  }, [triggerRef]);

  const openMenu = useCallback(() => {
    computePos();
    setOpen(true);
  }, [computePos]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const toggleMenu = useCallback(() => {
    if (open) closeMenu();
    else openMenu();
  }, [open, openMenu, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, rootRef]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  /** After layout, set `left` from measured width: start-aligned with trigger, or end-aligned when clipped. */
  useEffect(() => {
    if (!open) return;
    let raf0 = 0;
    let raf1 = 0;
    raf0 = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(() => {
        const menu = menuRef.current;
        const trigger = triggerRef.current;
        if (!menu || !trigger) return;
        const m = menu.getBoundingClientRect();
        const r = trigger.getBoundingClientRect();
        const pad = 8;
        const vw = window.innerWidth;
        const left = horizontalLeftForPanel(r, m.width, vw, pad);

        setMenuPos((prev) => {
          if (Math.abs(prev.left - left) < 0.5) return prev;
          return { ...prev, left };
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(raf1);
    };
  }, [open]);

  return { open, menuRef, menuPos, openMenu, closeMenu, toggleMenu } as const;
}
