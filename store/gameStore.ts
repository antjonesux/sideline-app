"use client";

import type { LiveGameState, LocalTimelineEvent } from "@/lib/mvp4Types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getDefensiveSchemeForTeam } from "@/lib/teamSchemes";

export type GameMode = "pregame" | "ingame";

export type SheetViewMode = "situation" | "formation";

export type GamePlanInGameTab = "calls" | "mysheet" | "timeline";

const defaultLiveGameState = (): LiveGameState => ({
  fieldZone: "MIDFIELD",
  down: 1,
  distanceBucket: "MED",
  scoreContext: "CLOSE",
  quarter: 1,
  coverageTags: [],
  twoMinuteDrill: false,
});

interface GameStore {
  activeSchemeId: string | null;
  selectedDefensiveScheme: string | null;
  selectedOpponentTeam: string | null;
  gameMode: GameMode;
  screenshotMode: boolean;
  activeSituationKey: string | null;
  /** Saved play sheet used in In-Game "My Sheet" tab */
  activePlaySheetId: string | null;
  sheetViewMode: SheetViewMode;
  gamePlanInGameTab: GamePlanInGameTab;
  /** MVP 4: server session id or null (local-only when API unavailable). */
  gameSessionId: string | null;
  /** MVP 4: timeline mirrored locally for instant UI + offline. */
  localTimelineEvents: LocalTimelineEvent[];
  liveGameState: LiveGameState;
  setGameSessionId: (id: string | null) => void;
  appendLocalTimelineEvent: (e: LocalTimelineEvent) => void;
  clearLocalTimeline: () => void;
  setLiveGameState: (patch: Partial<LiveGameState>) => void;
  resetLiveGameState: () => void;
  setActiveSchemeId: (id: string | null) => void;
  setOpponentByTeam: (teamName: string) => void;
  setOpponentByScheme: (defensiveScheme: string) => void;
  clearOpponent: () => void;
  setGameMode: (mode: GameMode) => void;
  setScreenshotMode: (on: boolean) => void;
  setActiveSituationKey: (key: string | null) => void;
  setActivePlaySheetId: (id: string | null) => void;
  setSheetViewMode: (mode: SheetViewMode) => void;
  setGamePlanInGameTab: (tab: GamePlanInGameTab) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      activeSchemeId: null,
      selectedDefensiveScheme: null,
      selectedOpponentTeam: null,
      gameMode: "pregame",
      screenshotMode: false,
      activeSituationKey: null,
      activePlaySheetId: null,
      sheetViewMode: "situation",
      gamePlanInGameTab: "calls",
      gameSessionId: null,
      localTimelineEvents: [],
      liveGameState: defaultLiveGameState(),

      setActiveSchemeId: (id) => set({ activeSchemeId: id }),

      setGameSessionId: (id) => set({ gameSessionId: id }),

      appendLocalTimelineEvent: (e) =>
        set((s) => ({
          localTimelineEvents: [...s.localTimelineEvents, e],
        })),

      clearLocalTimeline: () => set({ localTimelineEvents: [] }),

      setLiveGameState: (patch) =>
        set((s) => ({
          liveGameState: { ...s.liveGameState, ...patch },
        })),

      resetLiveGameState: () =>
        set({ liveGameState: defaultLiveGameState() }),

      setOpponentByTeam: (teamName) => {
        const scheme = getDefensiveSchemeForTeam(teamName);
        if (!scheme) return;
        set({
          selectedOpponentTeam: teamName.trim(),
          selectedDefensiveScheme: scheme,
        });
      },

      setOpponentByScheme: (defensiveScheme) =>
        set({
          selectedDefensiveScheme: defensiveScheme,
          selectedOpponentTeam: null,
        }),

      clearOpponent: () =>
        set({
          selectedDefensiveScheme: null,
          selectedOpponentTeam: null,
          activeSituationKey: null,
        }),

      setGameMode: (mode) => set({ gameMode: mode }),

      setScreenshotMode: (on) => set({ screenshotMode: on }),

      setActiveSituationKey: (key) => set({ activeSituationKey: key }),

      setActivePlaySheetId: (id) => set({ activePlaySheetId: id }),

      setSheetViewMode: (mode) => set({ sheetViewMode: mode }),

      setGamePlanInGameTab: (tab) => set({ gamePlanInGameTab: tab }),
    }),
    {
      name: "sideline-mvp2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeSchemeId: s.activeSchemeId,
        selectedDefensiveScheme: s.selectedDefensiveScheme,
        selectedOpponentTeam: s.selectedOpponentTeam,
        gameMode: s.gameMode,
        activeSituationKey: s.activeSituationKey,
        activePlaySheetId: s.activePlaySheetId,
        sheetViewMode: s.sheetViewMode,
        gamePlanInGameTab: s.gamePlanInGameTab,
      }),
    },
  ),
);
