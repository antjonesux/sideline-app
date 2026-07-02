/** User-scoped localStorage flag: carousel skipped or full onboarding completed. */

export const ONBOARDING_KEY_PREFIX = "sideline-onboarding-dismissed";

/** Product gate: when false, onboarding UI is skipped; implementation stays in repo. */
export const ONBOARDING_ENABLED = false;

/** Dev-only: force carousel; must stay `false` in commits. */
export const FORCE_ONBOARDING = false;

export function getOnboardingKey(userId: string): string {
  return `${ONBOARDING_KEY_PREFIX}:${userId}`;
}

export function isOnboardingDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getOnboardingKey(userId)) === "true";
}

export function dismissOnboarding(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getOnboardingKey(userId), "true");
}
