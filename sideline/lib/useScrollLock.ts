"use client";

import { useEffect } from "react";

/**
 * Prevents background scroll while a modal / drawer is open.
 *
 * Avoids `position: fixed` on `body` — that pattern breaks focused inputs (search fields,
 * keyboards) inside full-screen overlays on iOS Safari and some mobile WebViews.
 */
export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.paddingRight = prev.bodyPaddingRight;
    };
  }, [isOpen]);
}
