"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import Link from "next/link";
import { ChartNoAxesCombined, ClipboardList, Video } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { APP_SHELL_MOBILE_TABS } from "@/lib/navigation/appShellNav";
import {
  isAuthOrMarketingPath,
  isOnboardingChromePath,
  isPublicPlaybooksPath,
  shouldUseAppShell,
} from "@/lib/navigation/appShellRoutes";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";

/** Mobile bottom tab bar — disabled; hamburger drawer is the nav source on all breakpoints. */
export const BOTTOM_TAB_NAV_ENABLED = false;

const TAB_ICONS = {
  "/film": Video,
  "/playbook": ClipboardList,
  "/tendencies": ChartNoAxesCombined,
} as const;

export default function BottomTabNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const isAuthenticated = Boolean(user);
  const authOpts = useMemo(
    () => ({ isAuthenticated: isLoading ? false : isAuthenticated }),
    [isAuthenticated, isLoading],
  );

  const onboardingChrome = useMemo(
    () => isOnboardingChromePath(pathname, searchParams),
    [pathname, searchParams],
  );

  const shellActive = useMemo(
    () => shouldUseAppShell(pathname, searchParams, authOpts),
    [pathname, searchParams, authOpts],
  );

  const showMobileTabBar =
    BOTTOM_TAB_NAV_ENABLED && shellActive && !onboardingChrome && !isAuthOrMarketingPath(pathname);

  const hamburgerNavChrome =
    shellActive &&
    !onboardingChrome &&
    (!isAuthOrMarketingPath(pathname) || (isPublicPlaybooksPath(pathname) && isAuthenticated));

  /** Chrome flags for full-bleed / reduced-inset shells (see globals.css). */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (onboardingChrome) root.setAttribute("data-onboarding-chrome", "true");
    else root.removeAttribute("data-onboarding-chrome");
    const marketingChrome =
      pathname === "/landing" || (isPublicPlaybooksPath(pathname) && !isAuthenticated);
    if (marketingChrome) root.setAttribute("data-marketing-chrome", "true");
    else root.removeAttribute("data-marketing-chrome");
    if (hamburgerNavChrome) root.setAttribute("data-hamburger-nav-chrome", "true");
    else root.removeAttribute("data-hamburger-nav-chrome");
    return () => {
      root.removeAttribute("data-onboarding-chrome");
      root.removeAttribute("data-marketing-chrome");
      root.removeAttribute("data-hamburger-nav-chrome");
    };
  }, [onboardingChrome, pathname, hamburgerNavChrome, isAuthenticated]);

  if (!showMobileTabBar) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:hidden"
      aria-label="Main navigation"
    >
      <ul className="mx-auto grid w-full max-w-[var(--app-shell-max-width)] grid-cols-3 gap-2 px-[var(--app-shell-px)]">
        {APP_SHELL_MOBILE_TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = TAB_ICONS[tab.href];
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                title={tab.label}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 font-sans text-xs font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
