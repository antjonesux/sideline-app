"use client";

import { useEffect, useState } from "react";
import type { PlaybookEntry } from "@/lib/playbook";
import {
  defensivePlayTypeBadgeClass,
  isDefensivePlayType,
  resolveDefensiveDisplayPlayType,
  type DefensivePlayType,
} from "@/lib/defensivePlayTypeResolution";
import { DefensiveResultTagPicker } from "@/components/film/DefensiveResultTagPicker";
import { BallSpotControls, useBallSpotInput } from "@/components/film/BallSpotInput";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { startCriticalFlow } from "@/lib/perfInstrumentation";
import type { DefensiveResultTag } from "@/lib/defensiveResultTags";
import type { GameState } from "@/lib/gameStateEngine";

function catalogPlayTypeBadge(play: PlaybookEntry): DefensivePlayType | null {
  if (isDefensivePlayType(play.play_type)) return play.play_type;
  return resolveDefensiveDisplayPlayType(play.play_name, play.play_type);
}

interface DefensiveLogSheetProps {
  play: PlaybookEntry;
  currentGameState: GameState;
  onLog: (
    resultTags: DefensiveResultTag[],
    yards: number,
    endingFieldPos: number,
    submitFlowId?: string,
  ) => Promise<void>;
  onCancel: () => void;
}

export function DefensiveLogSheet({ play, currentGameState, onLog, onCancel }: DefensiveLogSheetProps) {
  const playType = catalogPlayTypeBadge(play);
  const startFP = currentGameState.absoluteYard;
  const resetKey = `${play.play_id}-${play.play_name}-${play.formation}`;
  const ballSpot = useBallSpotInput({ startFP, resetKey });
  const [selectedTags, setSelectedTags] = useState<DefensiveResultTag[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.history.pushState({ filmOverlay: "defensive-log-sheet" }, "");
    const onPop = () => onCancel();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onCancel]);

  const logReady = ballSpot.inputProvided && !busy;

  function yardsForSubmit(): number {
    return ballSpot.spotDelta ?? 0;
  }

  function endingFieldForSubmit(): number {
    return ballSpot.endFP ?? startFP;
  }

  function logCtaLabel(): string {
    if (!logReady) return "Enter ball spot";
    return `Log ${play.play_name} · ${ballSpot.endSide} ${ballSpot.endYardNum ?? ballSpot.endYardStr}`;
  }

  async function submit() {
    if (!logReady) return;
    const submitFlowId = startCriticalFlow("film_submit_to_next_play", {
      playId: play.play_id,
      playName: play.play_name,
      formation: play.formation,
    });
    setBusy(true);
    try {
      await onLog(selectedTags, yardsForSubmit(), endingFieldForSubmit(), submitFlowId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full border-t border-slate-800 bg-slate-900 px-4 pb-4 pt-3">
      <div className="mb-3 flex min-h-[44px] items-center">
        <IconBackButton aria-label="Back" onClick={onCancel} />
      </div>

      <div className="mb-4 border-b border-slate-700 pb-4">
        <div className="mb-1">
          <p className="text-xs font-semibold font-mono text-slate-500 uppercase tracking-widest">LOGGING PLAY</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-100">{play.play_name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-500">{play.formation}</p>
          </div>
          {playType ? (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${defensivePlayTypeBadgeClass(playType)}`}
            >
              {playType}
            </span>
          ) : null}
        </div>
      </div>

      <BallSpotControls
        endSide={ballSpot.endSide}
        setEndSide={ballSpot.setEndSide}
        endYardStr={ballSpot.endYardStr}
        setEndYardStr={ballSpot.setEndYardStr}
        endYardNum={ballSpot.endYardNum}
        displayYards={ballSpot.displayYards}
      />

      <div className="mt-4">
        <p className="text-xs font-semibold font-mono text-slate-500 uppercase tracking-widest">RESULT</p>
        <p className="mt-1 font-sans text-xs text-slate-500">Select one or more outcomes (optional).</p>
      </div>
      <div className="mt-2">
        <DefensiveResultTagPicker selected={selectedTags} onChange={setSelectedTags} />
      </div>

      <button
        type="button"
        disabled={!logReady}
        className={`mt-4 w-full rounded-lg py-3 text-sm font-semibold transition-all min-h-[44px] ${
          logReady ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-slate-800 text-slate-600 cursor-not-allowed"
        }`}
        onClick={() => void submit()}
      >
        {busy ? "Logging…" : logCtaLabel()}
      </button>
    </div>
  );
}
