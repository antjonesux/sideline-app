import { create } from "zustand";
import { persist } from "zustand/middleware";

type LastGamePrefsState = {
  my_playbook: string;
  my_scheme: string;
  setLastGame: (prefs: { my_playbook: string; my_scheme: string }) => void;
};

const PERSIST_VERSION = 3;

export const useLastGamePrefsStore = create<LastGamePrefsState>()(
  persist(
    (set) => ({
      my_playbook: "",
      my_scheme: "",
      setLastGame: (prefs) => set(prefs),
    }),
    {
      name: "sideline-last-game-prefs",
      version: PERSIST_VERSION,
      migrate: (persisted) => {
        const row = persisted as {
          my_playbook?: string;
          my_scheme?: string;
        };
        return {
          my_playbook: row.my_playbook ?? "",
          my_scheme: row.my_scheme ?? "",
        };
      },
    },
  ),
);
