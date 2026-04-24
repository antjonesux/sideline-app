import { create } from "zustand";
import { persist } from "zustand/middleware";

type LastGamePrefsState = {
  my_playbook: string;
  my_scheme: string;
  /** False until the coach finishes guided onboarding; absent in legacy persisted blobs. */
  guidedOnboardingDone: boolean;
  setLastGame: (prefs: { my_playbook: string; my_scheme: string }) => void;
  setGuidedOnboardingDone: (done: boolean) => void;
};

const PERSIST_VERSION = 1;

export const useLastGamePrefsStore = create<LastGamePrefsState>()(
  persist(
    (set) => ({
      my_playbook: "",
      my_scheme: "",
      guidedOnboardingDone: false,
      setLastGame: (prefs) => set(prefs),
      setGuidedOnboardingDone: (done) => set({ guidedOnboardingDone: done }),
    }),
    {
      name: "sideline-last-game-prefs",
      version: PERSIST_VERSION,
      migrate: (persisted, fromVersion) => {
        const row = persisted as {
          my_playbook?: string;
          my_scheme?: string;
          guidedOnboardingDone?: boolean;
        };
        if (fromVersion === 0) {
          return {
            my_playbook: row.my_playbook ?? "",
            my_scheme: row.my_scheme ?? "",
            guidedOnboardingDone: row.guidedOnboardingDone ?? true,
          };
        }
        return {
          my_playbook: row.my_playbook ?? "",
          my_scheme: row.my_scheme ?? "",
          guidedOnboardingDone: row.guidedOnboardingDone ?? false,
        };
      },
    },
  ),
);
