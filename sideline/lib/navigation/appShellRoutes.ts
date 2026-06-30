/**
 * Routes that use the responsive authenticated app shell (sidebar at md+, bottom nav on mobile).
 * Marketing, auth, onboarding, and QA preview routes stay on the legacy full-width chrome.
 */

const AUTH_MARKETING_PREFIXES = ["/login", "/signup", "/auth/", "/reset-password", "/landing"] as const;

export function isOnboardingChromePath(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/qa/onboarding")) return true;
  if (pathname === "/playbook" && searchParams.get("onboarding") === "1") return true;
  if (pathname.startsWith("/playbook/") && searchParams.get("onboarding") === "1") return true;
  if (pathname.startsWith("/film/") && searchParams.get("guided") === "1") return true;
  return false;
}

export function isAuthOrMarketingPath(pathname: string): boolean {
  if (pathname === "/landing") return true;
  return AUTH_MARKETING_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
  );
}

/** QA preview routes use mock chrome; no persistent sidebar. */
export function isQaPreviewPath(pathname: string): boolean {
  return pathname.startsWith("/qa/");
}

export function shouldUseAppShell(pathname: string, searchParams: URLSearchParams): boolean {
  if (isAuthOrMarketingPath(pathname)) return false;
  if (isOnboardingChromePath(pathname, searchParams)) return false;
  if (isQaPreviewPath(pathname)) return false;
  return true;
}
