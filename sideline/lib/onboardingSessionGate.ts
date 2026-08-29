/**
 * Session-scoped gate so per-feature onboarding waits for a navigation
 * after the welcome modal is dismissed (welcome takes priority).
 */

let pathAtWelcomeDismiss: string | null = null;
let welcomeDismissedThisSession = false;

export function markWelcomeDismissedForSession(pathname: string): void {
  pathAtWelcomeDismiss = pathname;
  welcomeDismissedThisSession = true;
}

export function wasWelcomeDismissedThisSession(): boolean {
  return welcomeDismissedThisSession;
}

export function shouldSuppressFeatureOnboarding(pathname: string): boolean {
  if (pathAtWelcomeDismiss === null) return false;
  if (pathname !== pathAtWelcomeDismiss) {
    pathAtWelcomeDismiss = null;
    return false;
  }
  return true;
}
