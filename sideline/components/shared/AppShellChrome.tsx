"use client";

import { WelcomeModalHost } from "@/components/onboarding/WelcomeModalHost";
import { AppShellSidebar } from "@/components/shared/AppShellSidebar";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  isPublicPlaybooksPath,
  shouldUseAppShell,
  shouldUseAppShellContainerScroll,
} from "@/lib/navigation/appShellRoutes";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";

/**
 * Responsive authenticated shell — persistent sidebar at `md+`, hamburger drawer on mobile.
 * Marketing, auth, and onboarding routes render children without shell chrome.
 * `/playbooks/*` uses the shell when the user is signed in.
 */
export function AppShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const isAuthenticated = Boolean(user);
  const shellActive = useMemo(
    () =>
      shouldUseAppShell(pathname, searchParams, {
        isAuthenticated: isLoading ? false : isAuthenticated,
      }),
    [pathname, searchParams, isAuthenticated, isLoading],
  );
  const containerScrollActive = useMemo(
    () =>
      shouldUseAppShellContainerScroll(pathname, searchParams, {
        isAuthenticated: isLoading ? false : isAuthenticated,
      }),
    [pathname, searchParams, isAuthenticated, isLoading],
  );
  const showWelcomeHost =
    shellActive && isAuthenticated && !isLoading && !isPublicPlaybooksPath(pathname);

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
      {showWelcomeHost ? <WelcomeModalHost /> : null}
    </div>
  );
}
