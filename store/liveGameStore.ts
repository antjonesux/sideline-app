"use client";

import type { GameState, PlaySheetPlay, ResultTag, Scenario } from "@/lib/liveTypes";
import { matchScenario } from "@/lib/scenarioMatcher";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type LoggedPlay = {
  id: string;
  playId: string;
  scenario: Scenario;
  formation: string;
  playName: string;
  resultTag: ResultTag;
  yardsGained: number;
};

interface LiveGameStore {
  sessionId: string | null;
  gameState: GameState;
  activeScenario: Scenario;
  playSheet: PlaySheetPlay[];
  usedThisDrive: string[];
  loggedPlays: LoggedPlay[];
  setSessionId: (id: string) => void;
  setPlaySheet: (plays: PlaySheetPlay[]) => void;
  patchGameState: (patch: Partial<GameState>) => void;
  setActiveScenario: (scenario: Scenario) => void;
  logPlay: (payload: Omit<LoggedPlay, "id">) => void;
}

const initialState: GameState = {
  fieldZone: "MIDFIELD",
  down: 1,
  distance: 10,
  scoreContext: "TIED",
  quarter: 1,
  twoMinuteWarning: false,
  defensiveScheme: "4-2-5",
};

export const useLiveGameStore = create<LiveGameStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      gameState: initialState,
      activeScenario: "1st Down",
      playSheet: [],
      usedThisDrive: [],
      loggedPlays: [],
      setSessionId: (id) => set({ sessionId: id }),
      setPlaySheet: (plays) => set({ playSheet: plays }),
      setActiveScenario: (scenario) => set({ activeScenario: scenario }),
      patchGameState: (patch) =>
        set((s) => {
          const gameState = { ...s.gameState, ...patch };
          return { gameState, activeScenario: matchScenario(gameState) };
        }),
      logPlay: (payload) =>
        set((s) => {
          const remaining = s.gameState.distance - payload.yardsGained;
          const firstDown = payload.resultTag === "FIRST_DOWN" || payload.resultTag === "TOUCHDOWN" || remaining <= 0;
          const nextDown = firstDown ? 1 : (Math.min(4, s.gameState.down + 1) as 1 | 2 | 3 | 4);
          const nextDistance = firstDown ? 10 : Math.max(1, remaining);
          const gameState = { ...s.gameState, down: nextDown, distance: nextDistance };
          return {
            gameState,
            activeScenario: matchScenario(gameState),
            usedThisDrive: [...s.usedThisDrive, payload.playId],
            loggedPlays: [...s.loggedPlays, { ...payload, id: crypto.randomUUID() }],
          };
        }),
    }),
    {
      name: "sideline-live-game",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        gameState: s.gameState,
        activeScenario: s.activeScenario,
        playSheet: s.playSheet,
        usedThisDrive: s.usedThisDrive,
        loggedPlays: s.loggedPlays,
      }),
    },
  ),
);
