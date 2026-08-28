"use client";

import { AppShellSidebar } from "@/components/shared/AppShellSidebar";
import {
  shouldUseAppShell,
  shouldUseAppShellContainerScroll,
} from "@/lib/navigation/appShellRoutes";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";

/**
 * Responsive authenticated shell — persistent sidebar at `md+`, hamburger drawer on mobile.
 * Marketing, auth, and onboarding routes render children without shell chrome.
 */
export function AppShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shellActive = useMemo(
    () => shouldUseAppShell(pathname, searchParams),
    [pathname, searchParams],
  );
  const containerScrollActive = useMemo(
    () => shouldUseAppShellContainerScroll(pathname, searchParams),
    [pathname, searchParams],
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (shellActive) root.setAttribute("data-app-shell-sidebar", "true");
    else root.removeAttribute("data-app-shell-sidebar");

    if (containerScrollActive) root.setAttribute("data-app-shell-container-scroll", "true");
    else root.removeAttribute("data-app-shell-container-scroll");

    return () => {
      root.removeAttribute("data-app-shell-sidebar");
      root.removeAttribute("data-app-shell-container-scroll");
    };
  }, [shellActive, containerScrollActive]);

  if (!shellActive) return <>{children}</>;

  return (
    <div className={cn("app-shell-frame w-full")}>
      <AppShellSidebar />
      <div className="app-shell-workspace flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
