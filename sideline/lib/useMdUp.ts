"use client";

import { useEffect, useState } from "react";

/** Tailwind `md` — tablet/desktop breakpoint for responsive overlay shells. */
export const MD_BREAKPOINT_PX = 768;

/** True when viewport is at or above the `md` breakpoint (tablet / desktop). */
export function useMdUp(): boolean {
  const [mdUp, setMdUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_BREAKPOINT_PX}px)`);
    const sync = () => setMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mdUp;
}
