/**
 * Routes that use the authenticated app shell (sidebar at md+, hamburger drawer on mobile).
 * Marketing, auth, onboarding, and QA preview routes stay on the legacy full-width chrome.
 * `/playbooks/*` is adaptive: app shell when signed in, marketing chrome when signed out.
 */

import { playSheetIdFromPath } from "@/lib/navigation/playSheetNav";

const AUTH_MARKETING_PREFIXES = [
  "/login",
  "/signup",
  "/auth/",
  "/reset-password",
  "/landing",
  "/terms",
  "/privacy",
] as const;

export function isPublicPlaybooksPath(pathname: string): boolean {
  return pathname === "/playbooks" || pathname.startsWith("/playbooks/");
}

export function isOnboardingChromePath(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/qa/onboarding")) return true;
  if (pathname === "/playbook" && searchParams.get("onboarding") === "1") return true;
  if (pathname.startsWith("/playbook/") && searchParams.get("onboarding") === "1") return true;
  if (pathname.startsWith("/film/") && searchParams.get("guided") === "1") return true;
  return false;
}

export function isAuthOrMarketingPath(pathname: string): boolean {
  if (isPublicPlaybooksPath(pathname)) return true;
  return AUTH_MARKETING_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/** QA preview routes use mock chrome; no persistent sidebar. */
export function isQaPreviewPath(pathname: string): boolean {
  return pathname.startsWith("/qa/");
}

export type AppShellAuthOptions = {
  /** When set, `/playbooks/*` uses the app shell for signed-in users. */
  isAuthenticated?: boolean;
};

export function shouldUseAppShell(
  pathname: string,
  searchParams: URLSearchParams,
  options?: AppShellAuthOptions,
): boolean {
  if (isPublicPlaybooksPath(pathname)) {
    return Boolean(options?.isAuthenticated);
  }
  if (isAuthOrMarketingPath(pathname)) return false;
  if (isOnboardingChromePath(pathname, searchParams)) return false;
  if (isQaPreviewPath(pathname)) return false;
  return true;
}

/** Film Room game detail — `/film/{id}` excluding new / import. */
export function isFilmGameDetailPath(pathname: string): boolean {
  if (!pathname.startsWith("/film/")) return false;
  const segment = pathname.slice("/film/".length).split("/")[0];
  if (!segment || segment === "new" || segment === "import") return false;
  return true;
}

/** Call sheet situation detail — `/playbook/{id}?situation=…`. */
export function isCallSheetSituationDetailPath(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (!playSheetIdFromPath(pathname)) return false;
  return Boolean(searchParams.get("situation")?.trim());
}

/**
 * QA51 Pass 3 — container-based scroll at `md+` on Film game details and call sheet
 * situation details only. Other shell routes keep page-level scroll.
 */
export function shouldUseAppShellContainerScroll(
  pathname: string,
  searchParams: URLSearchParams,
  options?: AppShellAuthOptions,
): boolean {
  if (!shouldUseAppShell(pathname, searchParams, options)) return false;
  return (
    isFilmGameDetailPath(pathname) || isCallSheetSituationDetailPath(pathname, searchParams)
  );
}
