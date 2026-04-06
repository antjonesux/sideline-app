import { create } from "zustand";

interface GameStore {
  activeSchemeId: string | null;
  setActiveSchemeId: (id: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  activeSchemeId: null,
  setActiveSchemeId: (id) => set({ activeSchemeId: id }),
}));
