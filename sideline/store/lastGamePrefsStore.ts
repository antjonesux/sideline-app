import { create } from "zustand";
import { persist } from "zustand/middleware";

type LastGamePrefsState = {
  my_playbook: string;
  my_scheme: string;
  setLastGame: (prefs: { my_playbook: string; my_scheme: string }) => void;
};

export const useLastGamePrefsStore = create<LastGamePrefsState>()(
  persist(
    (set) => ({
      my_playbook: "",
      my_scheme: "",
      setLastGame: (prefs) => set(prefs),
    }),
    { name: "sideline-last-game-prefs" },
  ),
);
