"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Drive, LoggedPlay } from "@/lib/types";
import { CompactGameStateBar } from "@/components/film/play-logger/CompactGameStateBar";
import { FormationPlaySearch, type FormationPlayValue } from "@/components/film/play-logger/FormationPlaySearch";
import { ResultGrid } from "@/components/film/play-logger/ResultGrid";
import { YardsInput } from "@/components/film/play-logger/YardsInput";
import { PlayLogFeed } from "@/components/film/play-logger/PlayLogFeed";
import {
  advanceGameState,
  deriveStoredResultTag,
  replayGameStateFromPlays,
  type GameState,
  type UiResultTag,
  type ResultTag,
} from "@/lib/gameStateEngine";
import { fromAbsoluteYard, toAbsoluteYard, yardsToEndZone } from "@/lib/fieldPosition";
import { useToastStore } from "@/store/toastStore";
import { useGameStore } from "@/store/gameStore";

type PlayLoggerProps = {
  gameSessionId: string;
  myPlaybook: string;
  opponentScheme: string;
  drive: Drive;
  editPlay: LoggedPlay | null;
  onEditPlayChange: (p: LoggedPlay | null) => void;
  onLogged: () => void | Promise<void>;
  onStartNewDrive: () => void | Promise<void>;
};

function storedTagToUi(tag: string): UiResultTag | null {
  const u = tag.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "FIRST_DOWN") return "GAIN";
  if (u === "NO_GAIN") return "NO_GAIN";
  if (u === "GAIN") return "GAIN";
  if (u === "LOSS" || u === "SACK") return "LOSS";
  if (u === "TOUCHDOWN") return "TOUCHDOWN";
  if (u === "INCOMPLETE") return "INCOMPLETE";
  if (u === "TURNOVER") return "TURNOVER";
  if (u === "PUNT") return "PUNT";
  if (u === "FIELD_GOAL") return "FIELD_GOAL";
  return null;
}

export function PlayLogger({
  gameSessionId,
  myPlaybook,
  opponentScheme,
  drive,
  editPlay,
  onEditPlayChange,
  onLogged,
  onStartNewDrive,
}: PlayLoggerProps) {
  const plays = drive.plays ?? [];
  const replayState = useMemo(
    () => replayGameStateFromPlays(plays, drive.drive_number),
    [plays, drive.drive_number],
  );

  const [manualGameState, setManualGameState] = useState<GameState | null>(null);
  useEffect(() => {
    if (editPlay) return;
    setManualGameState(null);
  }, [drive.id, plays, editPlay]);

  const gameState = manualGameState ?? replayState;

  const [formationPlay, setFormationPlay] = useState<FormationPlayValue | null>(null);
  const [uiResult, setUiResult] = useState<UiResultTag | null>(null);
  const [yardsText, setYardsText] = useState("");
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);
  const [optimisticPlays, setOptimisticPlays] = useState<LoggedPlay[]>([]);

  const formationRef = useRef<HTMLInputElement>(null);
  const yardsRef = useRef<HTMLInputElement>(null);
  const logBtnRef = useRef<HTMLButtonElement>(null);
  const addToast = useToastStore((s) => s.addToast);
  const prefillPlay = useGameStore((s) => s.prefillFormationPlay);
  const setPrefillPlay = useGameStore((s) => s.setPrefillFormationPlay);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (prefillPlay) {
      setFormationPlay({
        formation: prefillPlay.formation,
        play_name: prefillPlay.play_name,
        label: `${prefillPlay.formation} → ${prefillPlay.play_name}`,
      });
      setPrefillPlay(null);
    }
  }, [prefillPlay, setPrefillPlay]);

  useEffect(() => {
    if (editPlay) {
      wasEditingRef.current = true;
      const gs: GameState = {
        down: Math.min(4, Math.max(1, editPlay.down)) as 1 | 2 | 3 | 4,
        distance: Math.max(1, editPlay.distance),
        absoluteYard: toAbsoluteYard(editPlay.side, editPlay.yard_line),
        driveNumber: editPlay.drive_number ?? drive.drive_number,
        playNumber: Math.max(0, (editPlay.play_number ?? 1) - 1),
      };
      setManualGameState(gs);
      setFormationPlay({
        formation: editPlay.formation,
        play_name: editPlay.play_name,
        label: `${editPlay.formation} → ${editPlay.play_name}`,
      });
      setUiResult(storedTagToUi(editPlay.result_tag));
      const t = storedTagToUi(editPlay.result_tag);
      const y = editPlay.yards_gained ?? 0;
      if (t === "LOSS") setYardsText(String(Math.abs(y)));
      else setYardsText(String(Math.max(0, y)));
      setNote(editPlay.note ?? "");
      return;
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false;
      setFormationPlay(null);
      setUiResult(null);
      setYardsText("");
      setNote("");
    }
  }, [editPlay, drive.drive_number]);

  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);
  const isGoalToGo = side === "OPP" && yard_line >= 1 && yard_line <= 10;
  const distanceAtSnap = isGoalToGo ? yard_line : gameState.distance;

  const lastUiResult = useRef<UiResultTag | null>(null);
  useEffect(() => {
    if (editPlay) {
      lastUiResult.current = uiResult;
      return;
    }
    if (uiResult === lastUiResult.current) return;
    lastUiResult.current = uiResult;
    if (!uiResult) return;
    if (uiResult === "LOSS") setYardsText((t) => (t === "" ? "5" : t));
    else if (uiResult === "PUNT") setYardsText((t) => (t === "" ? "40" : t));
    else if (uiResult === "NO_GAIN" || uiResult === "INCOMPLETE" || uiResult === "TURNOVER" || uiResult === "FIELD_GOAL") {
      setYardsText("0");
    } else if (uiResult === "GAIN") setYardsText("");
  }, [uiResult, editPlay]);

  useEffect(() => {
    if (editPlay) return;
    if (uiResult !== "TOUCHDOWN") return;
    setYardsText(String(yardsToEndZone(gameState.absoluteYard)));
  }, [gameState.absoluteYard, uiResult, editPlay]);

  useEffect(() => {
    if (editPlay || !uiResult) return;
    const skipYards =
      uiResult === "NO_GAIN" ||
      uiResult === "INCOMPLETE" ||
      uiResult === "FIELD_GOAL" ||
      uiResult === "TURNOVER";
    if (skipYards) {
      queueMicrotask(() => logBtnRef.current?.focus());
    } else if (uiResult === "GAIN" || uiResult === "LOSS" || uiResult === "PUNT" || uiResult === "TOUCHDOWN") {
      queueMicrotask(() => yardsRef.current?.focus());
    }
  }, [uiResult, editPlay]);

  const mergedPlays = useMemo(() => {
    const base = [...plays].sort((a, b) => (a.play_number ?? 0) - (b.play_number ?? 0));
    return [...base, ...optimisticPlays];
  }, [plays, optimisticPlays]);

  const resetFormAfterLog = useCallback(() => {
    setFormationPlay(null);
    setUiResult(null);
    setYardsText("");
    setNote("");
    lastUiResult.current = null;
    queueMicrotask(() => formationRef.current?.focus());
  }, []);

  function parseYardsForSubmit(): { yardsGainedDb: number; yardsForEngine: number; error?: string } {
    if (!uiResult) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Select a result." };
    if (
      uiResult === "NO_GAIN" ||
      uiResult === "INCOMPLETE" ||
      uiResult === "TURNOVER" ||
      uiResult === "FIELD_GOAL"
    ) {
      return { yardsGainedDb: 0, yardsForEngine: 0 };
    }
    if (uiResult === "LOSS") {
      const n = parseInt(yardsText, 10);
      const mag = Number.isNaN(n) || n < 1 ? 5 : n;
      return { yardsGainedDb: -mag, yardsForEngine: -mag };
    }
    if (uiResult === "PUNT") {
      const n = yardsText === "" ? 40 : parseInt(yardsText, 10);
      const v = Number.isNaN(n) || n < 0 ? 40 : n;
      return { yardsGainedDb: v, yardsForEngine: v };
    }
    const n = parseInt(yardsText, 10);
    if (Number.isNaN(n)) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter yards." };
    if (uiResult === "GAIN" && n < 1) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Yards must be positive." };
    if (uiResult === "TOUCHDOWN" && n < 1) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter touchdown yards." };
    return { yardsGainedDb: n, yardsForEngine: n };
  }

  const canSubmit = useMemo(() => {
    if (!formationPlay?.formation || !formationPlay?.play_name || !uiResult) return false;
    if (uiResult === "PUNT") {
      if (yardsText.trim() === "") return true;
      const n = parseInt(yardsText, 10);
      return !Number.isNaN(n) && n >= 0;
    }
    if (uiResult === "GAIN" || uiResult === "TOUCHDOWN" || uiResult === "LOSS") {
      if (yardsText.trim() === "") return false;
      const n = parseInt(yardsText, 10);
      if (Number.isNaN(n)) return false;
      if (uiResult === "GAIN" && n < 1) return false;
      if (uiResult === "TOUCHDOWN" && n < 1) return false;
      if (uiResult === "LOSS" && n < 1) return false;
    }
    return true;
  }, [formationPlay, uiResult, yardsText]);

  async function submitLog() {
    if (!formationPlay || !uiResult || logging) return;
    const { yardsGainedDb, yardsForEngine, error } = parseYardsForSubmit();
    if (error) {
      addToast(error, "error");
      return;
    }

    let storedTag: ResultTag;
    if (uiResult === "GAIN") {
      storedTag = deriveStoredResultTag("GAIN", Math.max(0, yardsGainedDb), distanceAtSnap);
    } else {
      storedTag = uiResult as ResultTag;
    }

    const payload = {
      down: gameState.down,
      distance: distanceAtSnap,
      yard_line,
      side,
      hash: "MIDDLE" as const,
      formation: formationPlay.formation,
      play_name: formationPlay.play_name,
      result_tag: storedTag,
      yards_gained: yardsGainedDb,
      note: note.trim() || null,
      game_session_id: gameSessionId,
      opponent_scheme: opponentScheme,
      drive_number: drive.drive_number,
    };

    setLogging(true);
    if (editPlay) {
      try {
        const res = await fetch(`/api/plays/${editPlay.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          addToast(body.error ?? "Failed to save play — tap to retry", "error");
          return;
        }
        addToast("Play updated", "success");
        onEditPlayChange(null);
        resetFormAfterLog();
        await onLogged();
      } finally {
        setLogging(false);
      }
      return;
    }

    const nextPlayNo = (plays[plays.length - 1]?.play_number ?? 0) + 1;
    const optimistic: LoggedPlay = {
      id: `optimistic-${Date.now()}`,
      play_number: nextPlayNo,
      drive_number: drive.drive_number,
      down: gameState.down,
      distance: distanceAtSnap,
      side,
      yard_line,
      hash: "MIDDLE",
      formation: formationPlay.formation,
      play_name: formationPlay.play_name,
      result_tag: storedTag,
      yards_gained: yardsGainedDb,
      note: note.trim() || null,
    };
    const nextState = advanceGameState(gameState, storedTag, yardsForEngine);
    setManualGameState(nextState);
    setOptimisticPlays((o) => [...o, optimistic]);

    try {
      const res = await fetch(`/api/drives/${drive.id}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setOptimisticPlays((o) => o.filter((x) => x.id !== optimistic.id));
        setManualGameState(null);
        addToast(body.error ?? "Failed to save play — tap to retry", "error");
        return;
      }
      addToast("Play logged", "success");
      setOptimisticPlays((o) => o.filter((x) => x.id !== optimistic.id));
      resetFormAfterLog();
      await onLogged();
    } finally {
      setLogging(false);
    }
  }

  async function deletePlay(p: LoggedPlay) {
    if (p.id.startsWith("optimistic-")) return;
    const res = await fetch(`/api/plays/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      addToast("Failed to delete play", "error");
      throw new Error("delete failed");
    }
    addToast("Play deleted", "success");
    if (editPlay?.id === p.id) onEditPlayChange(null);
    setManualGameState(null);
    await onLogged();
  }

  return (
    <div className="space-y-3">
      <CompactGameStateBar
        gameState={gameState}
        onChange={setManualGameState}
        onStartNewDrive={() => void onStartNewDrive()}
      />

      <div className="app-card app-card-pad space-y-3">
        <FormationPlaySearch
          myPlaybook={myPlaybook}
          value={formationPlay}
          onChange={setFormationPlay}
          inputRef={formationRef}
        />

        <ResultGrid
          value={uiResult}
          onChange={(tag) => {
            setUiResult(tag);
          }}
        />

        <YardsInput uiResult={uiResult} yardsText={yardsText} onYardsTextChange={setYardsText} inputRef={yardsRef} />

        <div>
          <label htmlFor="play-logger-note" className="app-field-label text-slate-500">
            Note (optional)
          </label>
          <input
            id="play-logger-note"
            maxLength={60}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 font-sans text-sm text-white placeholder:text-slate-500"
            placeholder="What happened? (optional)"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {editPlay ? (
            <button
              type="button"
              className="min-h-[52px] min-w-[44px] flex-1 rounded-lg px-4 font-sans text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
              onClick={() => onEditPlayChange(null)}
            >
              Cancel
            </button>
          ) : null}
          <button
            ref={logBtnRef}
            type="button"
            disabled={logging || !canSubmit}
            className={`min-h-[52px] flex-[2] rounded-lg px-4 font-display text-sm font-bold uppercase tracking-wider text-white transition-colors ${
              logging || !canSubmit ? "cursor-not-allowed bg-slate-700 text-slate-500" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            onClick={() => void submitLog()}
          >
            {logging ? "Saving…" : editPlay ? "Update play" : "Log play"}
          </button>
        </div>
      </div>

      <PlayLogFeed
        plays={mergedPlays}
        driveNumber={drive.drive_number}
        onSelectPlay={(p) => {
          if (p.id.startsWith("optimistic-")) return;
          onEditPlayChange(p);
        }}
        onDeletePlay={deletePlay}
      />
    </div>
  );
}
