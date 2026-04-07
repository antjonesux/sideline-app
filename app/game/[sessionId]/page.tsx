"use client";

import { GameStateBar } from "@/components/live/GameStateBar";
import { PlayList } from "@/components/live/PlayList";
import { RecommendationCards } from "@/components/live/RecommendationCards";
import { ResultLogger } from "@/components/live/ResultLogger";
import { ScenarioStrip } from "@/components/live/ScenarioStrip";
import { getRecommendations } from "@/lib/recommendationEngineLive";
import type { PlaySheetPlay, ResultTag } from "@/lib/liveTypes";
import { useLiveGameStore } from "@/store/liveGameStore";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function InGamePage({ params }: { params: { sessionId: string } }) {
  const [selectedPlay, setSelectedPlay] = useState<PlaySheetPlay | null>(null);
  const gameState = useLiveGameStore((s) => s.gameState);
  const activeScenario = useLiveGameStore((s) => s.activeScenario);
  const playSheet = useLiveGameStore((s) => s.playSheet);
  const usedThisDrive = useLiveGameStore((s) => s.usedThisDrive);
  const patchGameState = useLiveGameStore((s) => s.patchGameState);
  const setActiveScenario = useLiveGameStore((s) => s.setActiveScenario);
  const logPlayStore = useLiveGameStore((s) => s.logPlay);

  const recommendations = useMemo(
    () => getRecommendations(activeScenario, playSheet, gameState, usedThisDrive),
    [activeScenario, playSheet, gameState, usedThisDrive],
  );
  const scenarioPlays = useMemo(() => playSheet.filter((p) => p.scenario === activeScenario), [playSheet, activeScenario]);

  const logPlay = async (resultTag: ResultTag, yards: number, note?: string) => {
    if (!selectedPlay) return;
    logPlayStore({
      playId: selectedPlay.id,
      scenario: activeScenario,
      formation: selectedPlay.formation,
      playName: selectedPlay.playName,
      resultTag,
      yardsGained: yards,
    });
    await fetch(`/api/sessions/${params.sessionId}/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_session_id: params.sessionId,
        scenario: activeScenario,
        field_zone: gameState.fieldZone,
        down: gameState.down,
        distance: gameState.distance,
        score_context: gameState.scoreContext,
        quarter: gameState.quarter,
        formation: selectedPlay.formation,
        play_name: selectedPlay.playName,
        result_tag: resultTag,
        yards_gained: yards,
        note,
        defensive_scheme: gameState.defensiveScheme,
      }),
    });
    setSelectedPlay(null);
  };

  return (
    <main className="pb-8">
      <GameStateBar gameState={gameState} onPatch={patchGameState} />
      <RecommendationCards plays={recommendations} onSelect={setSelectedPlay} />
      <ScenarioStrip active={activeScenario} onSelect={setActiveScenario} />
      <PlayList plays={scenarioPlays} usedIds={usedThisDrive} onCall={setSelectedPlay} />
      <div className="px-3">
        <Link href={`/game/${params.sessionId}/postgame`} className="block rounded-lg border border-red-800 px-4 py-2 text-center text-red-400">
          End Game
        </Link>
      </div>
      <ResultLogger play={selectedPlay} onClose={() => setSelectedPlay(null)} onLog={logPlay} />
    </main>
  );
}
