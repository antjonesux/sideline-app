/** Marks `game_sessions` created during guided home onboarding (excluded from Film list + tendencies). */
export const GAME_SESSION_IMPORT_SOURCE_ONBOARDING = "onboarding" as const;

export function isOnboardingGameSession(row: { import_source?: string | null }): boolean {
  return row.import_source === GAME_SESSION_IMPORT_SOURCE_ONBOARDING;
}
