"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Drive, LoggedPlay } from "@/lib/types";
import { CompactGameStateBar } from "@/components/film/play-logger/CompactGameStateBar";
import { FormationPlaySearch, type FormationPlayValue } from "@/components/shared/FormationPlaySearch";
import { ResultGrid } from "@/components/film/play-logger/ResultGrid";
import { PlayLogFeed } from "@/components/film/play-logger/PlayLogFeed";
import {
  advanceGameState,
  deriveStoredResultTag,
  replayGameStateFromPlays,
  type GameState,
  type UiResultTag,
  type ResultTag,
} from "@/lib/gameStateEngine";
import { formatFieldPosition, fromAbsoluteYard, toAbsoluteYard, yardsToEndZone } from "@/lib/fieldPosition";
import { aggregateLoggedPlays } from "@/lib/loggedPlayStats";
import { normalizePlayName } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import { useGameStore } from "@/store/gameStore";

type PlayLoggerProps = {
  gameSessionId: string;
  myPlaybook: string;
  opponentScheme: string;
  drive: Drive;
  /** All plays in this game — used for formation/play usage stats in search results. */
  loggedPlaysForGameStats: LoggedPlay[];
  editPlay: LoggedPlay | null;
  onEditPlayChange: (p: LoggedPlay | null) => void;
  onLogged: () => void | Promise<void>;
  /** Persist starting field / down before the first play (merged into drive row). */
  onPersistDriveFields?: (partial: Partial<Drive>) => void;
};

type SituationOverride = "2 Minute" | "4 Minute" | "2 Point" | null;

function resultRequiresFormationPlay(ui: UiResultTag | null): boolean {
  if (!ui) return false;
  return ui === "GAIN" || ui === "LOSS" || ui === "NO_GAIN" || ui === "INCOMPLETE" || ui === "TOUCHDOWN";
}

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
  loggedPlaysForGameStats,
  editPlay,
  onEditPlayChange,
  onLogged,
  onPersistDriveFields,
}: PlayLoggerProps) {
  const plays = drive.plays ?? [];
  const replayState = useMemo(() => {
    const rowPlays = drive.plays ?? [];
    return replayGameStateFromPlays(rowPlays, drive.drive_number, drive);
  }, [drive]);

  const [manualGameState, setManualGameState] = useState<GameState | null>(null);

  const playChainFingerprint = useMemo(() => {
    const row = drive.plays ?? [];
    const last = row.length > 0 ? row[row.length - 1] : null;
    return `${drive.id}:${String(row.length)}:${last?.id ?? "none"}`;
  }, [drive.id, drive.plays]);

  useEffect(() => {
    if (editPlay) return;
    setManualGameState(null);
  }, [editPlay, playChainFingerprint]);

  const patchPlaySnapContext = useCallback(
    (partial: { down?: 1 | 2 | 3 | 4; distance?: number; isInches?: boolean }) => {
      setManualGameState((prev) => {
        const rowPlays = drive.plays ?? [];
        const replay = replayGameStateFromPlays(rowPlays, drive.drive_number, drive);
        const base = prev ?? replay;
        const nextDown = (partial.down !== undefined ? partial.down : base.down) as 1 | 2 | 3 | 4;
        const distSrc = partial.distance !== undefined ? partial.distance : base.distance;
        const nextDist = Math.max(1, Math.min(99, Math.round(Number(distSrc)) || 1));
        const nextInches =
          partial.isInches !== undefined
            ? Boolean(partial.isInches) && nextDist <= 1
            : nextDist > 1
              ? false
              : Boolean(base.isInches) && nextDist <= 1;
        return {
          ...base,
          down: Math.min(4, Math.max(1, nextDown)) as 1 | 2 | 3 | 4,
          distance: nextDist,
          isInches: nextInches,
        };
      });
    },
    [drive],
  );

  const gameState = manualGameState ?? replayState;

  const [formationPlay, setFormationPlay] = useState<FormationPlayValue | null>(null);
  const [uiResult, setUiResult] = useState<UiResultTag | null>(null);
  const [yardsText, setYardsText] = useState("");
  const [ballAtSide, setBallAtSide] = useState<"OWN" | "OPP">("OWN");
  const [ballAtYard, setBallAtYard] = useState("");
  const [situationOverride, setSituationOverride] = useState<SituationOverride>(null);
  const [logging, setLogging] = useState(false);
  const [optimisticPlays, setOptimisticPlays] = useState<LoggedPlay[]>([]);
  const submitLockRef = useRef(false);

  const formationRef = useRef<HTMLInputElement>(null);
  const yardsRef = useRef<HTMLInputElement>(null);
  const logBtnRef = useRef<HTMLButtonElement>(null);
  const addToast = useToastStore((s) => s.addToast);
  const prefillPlay = useGameStore((s) => s.prefillFormationPlay);
  const setPrefillPlay = useGameStore((s) => s.setPrefillFormationPlay);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (prefillPlay) {
      const pn = normalizePlayName(prefillPlay.play_name);
      setFormationPlay({
        formation: prefillPlay.formation,
        play_name: pn,
        label: `${prefillPlay.formation} → ${pn}`,
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
        isInches: Boolean(editPlay.is_inches) && editPlay.distance <= 1,
        absoluteYard: toAbsoluteYard(editPlay.side, editPlay.yard_line),
        driveNumber: editPlay.drive_number ?? drive.drive_number,
        playNumber: Math.max(0, (editPlay.play_number ?? 1) - 1),
      };
      setManualGameState(gs);
      const pn = normalizePlayName(editPlay.play_name);
      setFormationPlay({
        formation: editPlay.formation,
        play_name: pn,
        label: `${editPlay.formation} → ${pn}`,
      });
      setUiResult(storedTagToUi(editPlay.result_tag));
      const t = storedTagToUi(editPlay.result_tag);
      const y = editPlay.yards_gained ?? 0;
      if (t === "LOSS") setYardsText(String(Math.abs(y)));
      else setYardsText(String(Math.max(0, y)));
      const postPlayAbs = Math.min(99, Math.max(1, gs.absoluteYard + y));
      const postPlay = fromAbsoluteYard(postPlayAbs);
      setBallAtSide(postPlay.side);
      setBallAtYard(String(postPlay.yard_line));
      return;
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false;
      setFormationPlay(null);
      setUiResult(null);
      setYardsText("");
      setBallAtSide(side);
      setBallAtYard(String(yard_line));
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
    else if (
      uiResult === "NO_GAIN" ||
      uiResult === "INCOMPLETE" ||
      uiResult === "TURNOVER" ||
      uiResult === "FIELD_GOAL" ||
      uiResult === "PUNT"
    ) {
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
      uiResult === "TURNOVER" ||
      uiResult === "PUNT";
    if (skipYards) {
      queueMicrotask(() => logBtnRef.current?.focus());
    } else if (uiResult === "GAIN" || uiResult === "LOSS" || uiResult === "TOUCHDOWN") {
      queueMicrotask(() => yardsRef.current?.focus());
    }
  }, [uiResult, editPlay]);

  useEffect(() => {
    if (!editPlay) {
      setBallAtSide(side);
      setBallAtYard(String(yard_line));
    }
  }, [side, yard_line, editPlay]);

  const mergedPlays = useMemo(() => {
    const base = [...plays].sort((a, b) => (a.play_number ?? 0) - (b.play_number ?? 0));
    return [...base, ...optimisticPlays];
  }, [plays, optimisticPlays]);

  const { scenarioStatsRecord, formationStatsRecord } = useMemo(() => {
    const { byCombo, byFormation } = aggregateLoggedPlays(
      loggedPlaysForGameStats.map((p) => ({
        formation: p.formation,
        play_name: p.play_name,
        yards_gained: p.yards_gained,
        result_tag: p.result_tag,
        down: p.down,
        distance: p.distance,
      })),
    );
    return {
      scenarioStatsRecord: Object.fromEntries(byCombo.entries()) as Record<
        string,
        { uses: number; avg_yards: number; success_rate: number }
      >,
      formationStatsRecord: Object.fromEntries(byFormation.entries()) as Record<
        string,
        { uses: number; success_rate: number }
      >,
    };
  }, [loggedPlaysForGameStats]);

  const resetFormAfterLog = useCallback((stateForBall: GameState) => {
    const pos = fromAbsoluteYard(stateForBall.absoluteYard);
    setFormationPlay(null);
    setUiResult(null);
    setYardsText("");
    setBallAtSide(pos.side);
    setBallAtYard(String(pos.yard_line));
    setSituationOverride(null);
    lastUiResult.current = null;
    queueMicrotask(() => formationRef.current?.focus());
  }, []);

  function parseYardsForSubmit(): { yardsGainedDb: number; yardsForEngine: number; error?: string } {
    if (!uiResult) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Select a result." };
    if (
      uiResult === "NO_GAIN" ||
      uiResult === "INCOMPLETE" ||
      uiResult === "TURNOVER" ||
      uiResult === "FIELD_GOAL" ||
      uiResult === "PUNT"
    ) {
      return { yardsGainedDb: 0, yardsForEngine: 0 };
    }
    const needsBallAt = uiResult === "GAIN" || uiResult === "LOSS";
    if (needsBallAt) {
      const nextYard = parseInt(ballAtYard, 10);
      if (Number.isNaN(nextYard) || nextYard < 1 || nextYard > 50) {
        return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter Ball At yard line (1-50)." };
      }
      const newAbsolute = toAbsoluteYard(ballAtSide, nextYard);
      const yards = newAbsolute - gameState.absoluteYard;
      if (uiResult === "GAIN" && yards <= 0) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Ball At must be ahead of current spot." };
      if (uiResult === "LOSS" && yards >= 0) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Ball At must be behind current spot." };
      return { yardsGainedDb: yards, yardsForEngine: yards };
    }
    const n = parseInt(yardsText, 10);
    if (Number.isNaN(n)) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter yards." };
    if (uiResult === "TOUCHDOWN" && n < 1) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter touchdown yards." };
    return { yardsGainedDb: n, yardsForEngine: n };
  }

  const canSubmit = useMemo(() => {
    if (!uiResult) return false;
    const needsFp = resultRequiresFormationPlay(uiResult);
    if (needsFp) {
      if (!formationPlay?.formation?.trim() || !formationPlay?.play_name?.trim()) return false;
    }
    if (uiResult === "GAIN" || uiResult === "LOSS") {
      const n = parseInt(ballAtYard, 10);
      if (Number.isNaN(n) || n < 1 || n > 50) return false;
      const newAbsolute = toAbsoluteYard(ballAtSide, n);
      const yards = newAbsolute - gameState.absoluteYard;
      if (uiResult === "GAIN" && yards <= 0) return false;
      if (uiResult === "LOSS" && yards >= 0) return false;
    }
    if (uiResult === "TOUCHDOWN") {
      if (yardsText.trim() === "") return false;
      const n = parseInt(yardsText, 10);
      if (Number.isNaN(n)) return false;
      if (uiResult === "TOUCHDOWN" && n < 1) return false;
    }
    return true;
  }, [formationPlay, uiResult, yardsText, ballAtYard, ballAtSide, gameState.absoluteYard]);

  async function submitLog() {
    if (!uiResult) return;
    if (editPlay && logging) return;
    if (!editPlay && submitLockRef.current) return;
    const { yardsGainedDb, yardsForEngine, error } = parseYardsForSubmit();
    if (error) {
      addToast(error, "error");
      return;
    }

    const needsFp = resultRequiresFormationPlay(uiResult);
    let formation = formationPlay?.formation?.trim() ?? "";
    let playName = normalizePlayName(formationPlay?.play_name ?? "");
    if (!needsFp) {
      if (uiResult === "PUNT" && (!formation || !playName)) {
        formation = "PUNT";
        playName = "PUNT";
      } else if (uiResult === "FIELD_GOAL" && (!formation || !playName)) {
        formation = "FIELD GOAL";
        playName = "FIELD GOAL";
      } else if (uiResult === "TURNOVER" && (!formation || !playName)) {
        formation = "TURNOVER";
        playName = "TURNOVER";
      }
    }
    if (needsFp && (!formation || !playName)) {
      addToast("Select formation and play.", "error");
      return;
    }

    let storedTag: ResultTag;
    if (uiResult === "GAIN") {
      storedTag = deriveStoredResultTag("GAIN", Math.max(0, yardsGainedDb), distanceAtSnap);
    } else {
      storedTag = uiResult as ResultTag;
    }

    const inchesSnap = Boolean(gameState.isInches) && distanceAtSnap <= 1;

    const payload = {
      down: gameState.down,
      distance: distanceAtSnap,
      is_inches: inchesSnap,
      yard_line,
      side,
      hash: "MIDDLE" as const,
      formation,
      play_name: playName,
      result_tag: storedTag,
      yards_gained: yardsGainedDb,
      note: editPlay ? (editPlay.note ?? null) : null,
      game_session_id: gameSessionId,
      opponent_scheme: opponentScheme,
      drive_number: drive.drive_number,
      situation_override: situationOverride,
    };

    if (editPlay) {
      setLogging(true);
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
        resetFormAfterLog(gameState);
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
      is_inches: inchesSnap,
      side,
      yard_line,
      hash: "MIDDLE",
      formation,
      play_name: playName,
      result_tag: storedTag,
      yards_gained: yardsGainedDb,
      note: null,
    };
    const nextState = advanceGameState(gameState, storedTag, yardsForEngine);
    submitLockRef.current = true;
    setManualGameState(nextState);
    setOptimisticPlays((o) => [...o, optimistic]);
    resetFormAfterLog(nextState);
    addToast("Play logged", "success");

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
      setOptimisticPlays((o) => o.filter((x) => x.id !== optimistic.id));
      await onLogged();
    } finally {
      submitLockRef.current = false;
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

  const showSnapSpotEditor = Boolean(!editPlay && plays.length === 0 && onPersistDriveFields);
  const absForSnap = gameState.absoluteYard;
  const canExpressOwn = absForSnap >= 1 && absForSnap <= 50;
  const canExpressOpp = absForSnap >= 50 && absForSnap <= 99;

  const [snapYardDraft, setSnapYardDraft] = useState("");
  const [snapYardEditing, setSnapYardEditing] = useState(false);
  useEffect(() => {
    if (!snapYardEditing) setSnapYardDraft(String(fromAbsoluteYard(absForSnap).yard_line));
  }, [absForSnap, snapYardEditing]);

  const showPlaySnapControls = Boolean(editPlay || plays.length > 0);

  return (
    <div className="space-y-3">
      <CompactGameStateBar key={`${drive.id}-${editPlay?.id ?? "log"}`} gameState={gameState}>
        {showPlaySnapControls || showSnapSpotEditor ? (
          <>
            {showPlaySnapControls ? (
              <>
            <div>
              <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Down</p>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4] as const).map((d) => {
                  const selected = gameState.down === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                        selected
                          ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                          : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                      }`}
                      onClick={() => patchPlaySnapContext({ down: d })}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="app-field-label text-slate-500 dark:text-slate-500">Distance</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="app-input-compact mt-1.5 w-full text-center font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={String(gameState.distance)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const n = raw === "" ? 10 : Math.min(99, Math.max(1, parseInt(raw, 10) || 1));
                  patchPlaySnapContext({ distance: n });
                }}
              />
            </label>
            {gameState.distance <= 1 ? (
              <div>
                <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Short yardage</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      !gameState.isInches
                        ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => patchPlaySnapContext({ isInches: false })}
                  >
                    1 yd
                  </button>
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      Boolean(gameState.isInches)
                        ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => patchPlaySnapContext({ isInches: true })}
                  >
                    {"\u0026 inches"}
                  </button>
                </div>
              </div>
            ) : null}
              </>
            ) : null}
            {showSnapSpotEditor ? (
              <>
            <div>
              <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Down</p>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4] as const).map((d) => {
                  const selected = gameState.down === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                        selected
                          ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                          : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                      }`}
                      onClick={() => onPersistDriveFields?.({ starting_down: d })}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="app-field-label text-slate-500 dark:text-slate-500">Distance</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="app-input-compact mt-1.5 w-full text-center font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={String(gameState.distance)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const n = raw === "" ? 10 : Math.min(99, Math.max(1, parseInt(raw, 10) || 1));
                  onPersistDriveFields?.({
                    starting_distance: n,
                    is_inches: n <= 1 ? Boolean(drive.is_inches) : false,
                  });
                }}
              />
            </label>
            {gameState.distance <= 1 ? (
              <div>
                <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Short yardage</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      !drive.is_inches
                        ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => onPersistDriveFields?.({ is_inches: false })}
                  >
                    1 yd
                  </button>
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      Boolean(drive.is_inches)
                        ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => onPersistDriveFields?.({ is_inches: true })}
                  >
                    {"\u0026 inches"}
                  </button>
                </div>
              </div>
            ) : null}
            <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Field position</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!canExpressOwn}
                    title={!canExpressOwn ? "Ball is past midfield — use opponent side for this spot." : undefined}
                    className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                      fromAbsoluteYard(absForSnap).side === "OWN"
                        ? "border border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => {
                      if (!canExpressOwn || !onPersistDriveFields) return;
                      onPersistDriveFields({ starting_side: "OWN", starting_yard_line: absForSnap });
                    }}
                  >
                    OWN
                  </button>
                  <button
                    type="button"
                    disabled={!canExpressOpp}
                    title={!canExpressOpp ? "Ball is inside your own 50 — use own side for this spot." : undefined}
                    className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                      fromAbsoluteYard(absForSnap).side === "OPP"
                        ? "border border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                        : "border border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                    }`}
                    onClick={() => {
                      if (!canExpressOpp || !onPersistDriveFields) return;
                      onPersistDriveFields({ starting_side: "OPP", starting_yard_line: 100 - absForSnap });
                    }}
                  >
                    OPP
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="Yard line (1–50)"
                    className="min-h-11 min-w-[5rem] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center font-mono text-sm text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    value={snapYardDraft}
                    onFocus={() => setSnapYardEditing(true)}
                    onChange={(e) => setSnapYardDraft(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => {
                      setSnapYardEditing(false);
                      const raw = snapYardDraft.trim();
                      const n = raw === "" ? fromAbsoluteYard(absForSnap).yard_line : Math.min(50, Math.max(1, parseInt(raw, 10) || 1));
                      const side = fromAbsoluteYard(absForSnap).side;
                      onPersistDriveFields?.({ starting_side: side, starting_yard_line: n });
                    }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-500">{formatFieldPosition(absForSnap)}</p>
              </>
            ) : null}
          </>
        ) : null}
      </CompactGameStateBar>

      <div className="app-card flex max-h-[70vh] flex-col overflow-hidden rounded-xl p-0">
        <div className="space-y-3 overflow-y-auto p-3">
          <div>
            <p className="app-field-label mb-1 text-slate-500">SITUATION</p>
            <div className="flex flex-wrap gap-2">
              {(["2 Minute", "4 Minute", "2 Point"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`rounded-full border px-3 py-1 font-mono text-xs uppercase ${
                    situationOverride === tag
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-700 text-slate-300"
                  }`}
                  onClick={() => setSituationOverride((prev) => (prev === tag ? null : tag))}
                >
                  {tag === "2 Minute" ? "2 Min" : tag === "4 Minute" ? "4 Min" : "2 Point"}
                </button>
              ))}
            </div>
          </div>

          <FormationPlaySearch
            dataSource={{ type: "api", playbook: myPlaybook }}
            value={formationPlay}
            onChange={setFormationPlay}
            inputRef={formationRef}
            scenarioStats={scenarioStatsRecord}
            formationStats={formationStatsRecord}
          />

          <ResultGrid
            value={uiResult}
            onChange={(tag) => {
              setUiResult(tag);
            }}
          />

          {uiResult === "GAIN" || uiResult === "LOSS" ? (
            <div>
              <p className="app-field-label mb-1.5 text-slate-500 dark:text-slate-500">Ball At</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    ballAtSide === "OWN"
                      ? "border border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                      : "border border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                  }`}
                  onClick={() => setBallAtSide("OWN")}
                >
                  OWN
                </button>
                <button
                  type="button"
                  className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    ballAtSide === "OPP"
                      ? "border border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                      : "border border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                  }`}
                  onClick={() => setBallAtSide("OPP")}
                >
                  OPP
                </button>
                <input
                  ref={yardsRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="yard line"
                  value={ballAtYard}
                  onChange={(e) => setBallAtYard(e.target.value.replace(/\D/g, ""))}
                  className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center font-mono text-sm text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {ballAtYard.trim() !== "" ? (
                <p className="mt-1 text-xs font-mono text-slate-400">
                  {(() => {
                    const n = parseInt(ballAtYard, 10);
                    if (Number.isNaN(n) || n < 1 || n > 50) return "Enter 1-50";
                    const calc = toAbsoluteYard(ballAtSide, n) - gameState.absoluteYard;
                    return calc >= 0 ? `+${calc} yards` : `${calc} yards`;
                  })()}
                </p>
              ) : null}
            </div>
          ) : null}
          {uiResult === "TOUCHDOWN" ? (
            <div>
              <label className="app-field-label text-slate-500">Yards</label>
              <input
                ref={yardsRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={yardsText}
                onChange={(e) => setYardsText(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono text-lg text-white"
              />
            </div>
          ) : null}

        </div>
        <div className="flex shrink-0 gap-2 border-t border-slate-800 p-3">
          {editPlay ? (
            <button
              type="button"
              className="min-h-11 rounded-lg px-3 font-sans text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
              onClick={() => onEditPlayChange(null)}
            >
              Cancel
            </button>
          ) : null}
          <button
            ref={logBtnRef}
            type="button"
            disabled={editPlay ? logging || !canSubmit : !canSubmit}
            className={`min-h-11 w-full rounded-lg px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition-colors motion-safe:active:scale-[0.97] motion-safe:duration-100 ${
              editPlay ? logging || !canSubmit : !canSubmit
                ? "cursor-not-allowed bg-slate-700 text-slate-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
            onClick={() => void submitLog()}
          >
            {editPlay && logging ? "Saving…" : editPlay ? "Update play" : "Log play"}
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
