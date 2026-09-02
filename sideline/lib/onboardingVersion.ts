export const CURRENT_WELCOME_VERSION = 1;

/**
 * QA mode: when true, modals ignore the "seen" state and fire on every
 * app load (welcome) / every feature route entry (per-feature onboarding).
 * Off in production so users see each modal only once as intended.
 * Flip to true again during future QA cycles.
 */
export const QA_FORCE_FIRE_MODALS = false;

export const FEATURE_ONBOARDING_KEYS = {
  callSheets: "call_sheets",
  schemes: "schemes",
  filmRoom: "film_room",
  tendencies: "tendencies",
} as const;

export type FeatureOnboardingKey =
  (typeof FEATURE_ONBOARDING_KEYS)[keyof typeof FEATURE_ONBOARDING_KEYS];

export const FEATURE_ONBOARDING_KEY_SET = new Set<string>(
  Object.values(FEATURE_ONBOARDING_KEYS),
);

export function isFeatureOnboardingKey(value: unknown): value is FeatureOnboardingKey {
  return typeof value === "string" && FEATURE_ONBOARDING_KEY_SET.has(value);
}

/**
 * True when the user has never seen welcome content, or is behind the current version.
 * When `QA_FORCE_FIRE_MODALS` is on, always true (seen state is ignored for display).
 */
export function shouldShowWelcomeModal(welcomeModalVersionSeen: number | null): boolean {
  if (QA_FORCE_FIRE_MODALS) return true;
  return welcomeModalVersionSeen === null || welcomeModalVersionSeen < CURRENT_WELCOME_VERSION;
}

/**
 * True when the feature onboarding modal should display for this key.
 * When `QA_FORCE_FIRE_MODALS` is on, always true (seen state is ignored for display).
 */
export function shouldShowFeatureOnboarding(seen: boolean | undefined): boolean {
  if (QA_FORCE_FIRE_MODALS) return true;
  return seen !== true;
}
