"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PortalMenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
};

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
    const spaceBelow = window.innerHeight - rect.bottom;
    setMenuPos(
      spaceBelow < 220
        ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, minWidth: rect.width }
        : { top: rect.bottom + 4, left: rect.left, minWidth: rect.width },
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

  return { open, menuRef, menuPos, openMenu, closeMenu, toggleMenu } as const;
}
