import { create } from "zustand";
import { persist } from "zustand/middleware";

type LastGamePrefsState = {
  my_playbook: string;
  my_scheme: string;
  /** True after guided onboarding insight is dismissed for `guidedOnboardingUserId`. */
  guidedOnboardingDone: boolean;
  /** Supabase user id who completed guided onboarding; completion applies only for this user. */
  guidedOnboardingUserId: string | null;
  setLastGame: (prefs: { my_playbook: string; my_scheme: string }) => void;
  setGuidedOnboardingDone: (done: boolean, userId?: string | null) => void;
};

const PERSIST_VERSION = 2;

export const useLastGamePrefsStore = create<LastGamePrefsState>()(
  persist(
    (set) => ({
      my_playbook: "",
      my_scheme: "",
      guidedOnboardingDone: false,
      guidedOnboardingUserId: null,
      setLastGame: (prefs) => set(prefs),
      setGuidedOnboardingDone: (done, userId) =>
        set({
          guidedOnboardingDone: done,
          guidedOnboardingUserId: done && userId ? userId : null,
        }),
    }),
    {
      name: "sideline-last-game-prefs",
      version: PERSIST_VERSION,
      migrate: (persisted, fromVersion) => {
        const row = persisted as {
          my_playbook?: string;
          my_scheme?: string;
          guidedOnboardingDone?: boolean;
          guidedOnboardingUserId?: string | null;
        };
        const base = {
          my_playbook: row.my_playbook ?? "",
          my_scheme: row.my_scheme ?? "",
          guidedOnboardingDone: row.guidedOnboardingDone ?? false,
          guidedOnboardingUserId: row.guidedOnboardingUserId ?? null,
        };
        if (fromVersion === 0) {
          return {
            ...base,
            guidedOnboardingDone: row.guidedOnboardingDone ?? true,
            guidedOnboardingUserId: null,
          };
        }
        if (fromVersion === 1) {
          return {
            ...base,
            guidedOnboardingUserId: null,
          };
        }
        return base;
      },
    },
  ),
);
