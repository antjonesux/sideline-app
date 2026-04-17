"use client";

import { useEffect } from "react";

export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const prev = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      overflow: bodyStyle.overflow,
      width: bodyStyle.width,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.overflow = "hidden";
    bodyStyle.width = "100%";

    return () => {
      bodyStyle.position = prev.position;
      bodyStyle.top = prev.top;
      bodyStyle.left = prev.left;
      bodyStyle.right = prev.right;
      bodyStyle.overflow = prev.overflow;
      bodyStyle.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
