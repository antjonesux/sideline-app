import { create } from "zustand";

/**
 * Lightweight global hook for cross-surface play logger integration (e.g. play sheet "Call"
 * prefill). Session field state stays server-derived inside `PlayLogger`.
 */
type GameStore = {
  /** When set, `PlayLogger` consumes and clears this prefill. */
  prefillFormationPlay: { formation: string; play_name: string } | null;
  setPrefillFormationPlay: (value: { formation: string; play_name: string } | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  prefillFormationPlay: null,
  setPrefillFormationPlay: (value) => set({ prefillFormationPlay: value }),
}));
