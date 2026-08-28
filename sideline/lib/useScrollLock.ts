"use client";

import { useEffect } from "react";

type SavedScrollStyles = {
  htmlOverflow: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyOverscroll: string;
};

let scrollLockCount = 0;
let savedScrollStyles: SavedScrollStyles | null = null;

function applyScrollLock() {
  const html = document.documentElement;
  const body = document.body;

  savedScrollStyles = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
  };

  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
}

function releaseScrollLock() {
  if (!savedScrollStyles) return;

  const html = document.documentElement;
  const body = document.body;
  const prev = savedScrollStyles;
  savedScrollStyles = null;

  html.style.overflow = prev.htmlOverflow;
  html.style.overscrollBehavior = prev.htmlOverscroll;
  body.style.overflow = prev.bodyOverflow;
  body.style.overscrollBehavior = prev.bodyOverscroll;
}

/**
 * Prevents background scroll while a modal / drawer is open.
 *
 * Uses a module-level lock count so nested overlays release scroll only when
 * the last lock closes. Does not set body padding-right — `html` uses
 * `scrollbar-gutter: stable` and Radix RemoveScroll is neutralized via
 * `body[data-scroll-locked]` in globals.css.
 */
export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    scrollLockCount += 1;
    if (scrollLockCount === 1) {
      applyScrollLock();
    }

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        releaseScrollLock();
      }
    };
  }, [isOpen]);
}
