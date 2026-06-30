"use client";

import { AppShellSidebar } from "@/components/shared/AppShellSidebar";
import { shouldUseAppShell } from "@/lib/navigation/appShellRoutes";
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

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (shellActive) root.setAttribute("data-app-shell-sidebar", "true");
    else root.removeAttribute("data-app-shell-sidebar");
    return () => root.removeAttribute("data-app-shell-sidebar");
  }, [shellActive]);

  if (!shellActive) return <>{children}</>;

  return (
    <div className={cn("app-shell-frame min-h-dvh w-full")}>
      <AppShellSidebar />
      <div className="app-shell-workspace flex min-h-dvh min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
