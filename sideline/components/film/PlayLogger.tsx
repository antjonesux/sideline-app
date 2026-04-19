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
import { COULDNT_DELETE, COULDNT_SAVE } from "@/lib/coachCopy";
import { getDrivePossessionOutcome, possessionEndedFromSnapAndTag } from "@/lib/driveOutcome";

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

  const patchSnapFieldPosition = useCallback(
    (nextSide: "OWN" | "OPP", yardLine1to50: number) => {
      const y = Math.min(50, Math.max(1, Math.round(yardLine1to50)));
      const abs = toAbsoluteYard(nextSide, y);
      setManualGameState((prev) => {
        const rowPlays = drive.plays ?? [];
        const replay = replayGameStateFromPlays(rowPlays, drive.drive_number, drive);
        const base = prev ?? replay;
        return { ...base, absoluteYard: abs };
      });
      if ((drive.plays?.length ?? 0) === 0) {
        onPersistDriveFields?.({ starting_side: nextSide, starting_yard_line: y });
      }
    },
    [drive, onPersistDriveFields],
  );

  const gameState = manualGameState ?? replayState;

  const [formationPlay, setFormationPlay] = useState<FormationPlayValue | null>(null);
  const [uiResult, setUiResult] = useState<UiResultTag | null>(null);
  const [yardsText, setYardsText] = useState("");
  /** Line of scrimmage (next snap) — OWN/OPP + yard 1–50. */
  const [ballAtSide, setBallAtSide] = useState<"OWN" | "OPP">("OWN");
  const [ballAtYard, setBallAtYard] = useState("");
  const [distanceStr, setDistanceStr] = useState("");
  const [situationOverride, setSituationOverride] = useState<SituationOverride>(null);
  const [logging, setLogging] = useState(false);
  const [optimisticPlays, setOptimisticPlays] = useState<LoggedPlay[]>([]);
  const submitLockRef = useRef(false);
  const distanceFieldFocusedRef = useRef(false);
  const snapYardFocusedRef = useRef(false);

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
      else if (t === "GAIN") setYardsText(String(Math.max(0, y)));
      else setYardsText(String(Math.max(0, y)));
      const snap = fromAbsoluteYard(gs.absoluteYard);
      setBallAtSide(snap.side);
      setBallAtYard(String(snap.yard_line));
      return;
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false;
      setFormationPlay(null);
      setUiResult(null);
      setYardsText("");
    }
  }, [editPlay, drive.drive_number]);

  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);
  const isGoalToGo = side === "OPP" && yard_line >= 1 && yard_line <= 10;

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
    if (editPlay) return;
    if (snapYardFocusedRef.current) return;
    setBallAtSide(side);
    setBallAtYard(String(yard_line));
  }, [side, yard_line, editPlay, playChainFingerprint]);

  useEffect(() => {
    if (distanceFieldFocusedRef.current) return;
    if (editPlay) {
      setDistanceStr(String(Math.max(1, editPlay.distance)));
      return;
    }
    setDistanceStr(String(gameState.distance));
  }, [playChainFingerprint, editPlay]);

  const drivePossessionOutcome = useMemo(() => getDrivePossessionOutcome(plays), [plays]);
  const drivePossessionEnded =
    !editPlay && plays.length > 0 && drivePossessionOutcome !== "ACTIVE" && drivePossessionOutcome !== "NO_PLAYS";

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
    if (!uiResult) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Pick a result." };
    if (
      uiResult === "NO_GAIN" ||
      uiResult === "INCOMPLETE" ||
      uiResult === "TURNOVER" ||
      uiResult === "FIELD_GOAL" ||
      uiResult === "PUNT"
    ) {
      return { yardsGainedDb: 0, yardsForEngine: 0 };
    }
    if (uiResult === "GAIN" || uiResult === "LOSS") {
      const raw = yardsText.trim();
      const n = parseInt(raw, 10);
      if (raw === "" || Number.isNaN(n) || n < 1) {
        return { yardsGainedDb: 0, yardsForEngine: 0, error: "Whole yards only (1–99)." };
      }
      if (uiResult === "GAIN") {
        return { yardsGainedDb: n, yardsForEngine: n };
      }
      return { yardsGainedDb: -n, yardsForEngine: n };
    }
    const n = parseInt(yardsText, 10);
    if (Number.isNaN(n)) return { yardsGainedDb: 0, yardsForEngine: 0, error: "Enter whole yards." };
    if (uiResult === "TOUCHDOWN" && n < 1) return { yardsGainedDb: 0, yardsForEngine: 0, error: "TD needs whole yards." };
    return { yardsGainedDb: n, yardsForEngine: n };
  }

  const canSubmit = useMemo(() => {
    if (!uiResult) return false;
    const needsFp = resultRequiresFormationPlay(uiResult);
    if (needsFp) {
      if (!formationPlay?.formation?.trim() || !formationPlay?.play_name?.trim()) return false;
    }
    if (uiResult === "GAIN" || uiResult === "LOSS") {
      const raw = yardsText.trim();
      const n = parseInt(raw, 10);
      if (raw === "" || Number.isNaN(n) || n < 1) return false;
    }
    if (uiResult === "TOUCHDOWN") {
      if (yardsText.trim() === "") return false;
      const n = parseInt(yardsText, 10);
      if (Number.isNaN(n)) return false;
      if (uiResult === "TOUCHDOWN" && n < 1) return false;
    }
    return true;
  }, [formationPlay, uiResult, yardsText]);

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
      addToast("Pick formation and play.", "error");
      return;
    }

    const rawDist = distanceStr.trim();
    const parsedFieldDist = rawDist === "" ? null : Number.parseInt(rawDist, 10);
    const snapBase =
      parsedFieldDist != null && !Number.isNaN(parsedFieldDist)
        ? Math.max(1, Math.min(99, parsedFieldDist))
        : gameState.distance;
    const distanceAtSubmit = isGoalToGo ? yard_line : snapBase;
    const inchesSnap = Boolean(gameState.isInches) && distanceAtSubmit <= 1;
    const stateForSubmit: GameState = {
      ...gameState,
      distance: distanceAtSubmit,
      isInches: inchesSnap,
    };

    let storedTag: ResultTag;
    if (uiResult === "GAIN") {
      storedTag = deriveStoredResultTag("GAIN", Math.max(0, yardsGainedDb), distanceAtSubmit);
    } else {
      storedTag = uiResult as ResultTag;
    }

    const payload = {
      down: stateForSubmit.down,
      distance: distanceAtSubmit,
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
          addToast(COULDNT_SAVE, "error");
          return;
        }
        addToast("Call updated.", "success");
        onEditPlayChange(null);
        resetFormAfterLog(stateForSubmit);
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
      down: stateForSubmit.down,
      distance: distanceAtSubmit,
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
    const nextState = advanceGameState(stateForSubmit, storedTag, yardsForEngine);
    submitLockRef.current = true;
    setManualGameState(nextState);
    setOptimisticPlays((o) => [...o, optimistic]);
    resetFormAfterLog(nextState);
    const ended = possessionEndedFromSnapAndTag(stateForSubmit.down, storedTag);
    addToast(ended ? "Call logged. Drive closed — add a drive from the log to keep going." : "Call logged.", "success");

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
        addToast(COULDNT_SAVE, "error");
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
      addToast(COULDNT_DELETE, "error");
      throw new Error("delete failed");
    }
    addToast("Call removed.", "success");
    if (editPlay?.id === p.id) onEditPlayChange(null);
    setManualGameState(null);
    await onLogged();
  }

  const showSnapSpotEditor = Boolean(!editPlay && plays.length === 0 && onPersistDriveFields);

  const showPlaySnapControls = Boolean(editPlay || plays.length > 0);

  const commitDistanceInput = useCallback(() => {
    distanceFieldFocusedRef.current = false;
    const raw = distanceStr.trim();
    if (raw === "") {
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const n = Math.max(1, Math.min(99, parsed));
    setDistanceStr(String(n));
    if (editPlay || plays.length > 0) {
      patchPlaySnapContext({ distance: n });
    } else {
      onPersistDriveFields?.({
        starting_distance: n,
        is_inches: n <= 1 ? Boolean(drive.is_inches) : false,
      });
    }
  }, [distanceStr, editPlay, plays.length, patchPlaySnapContext, onPersistDriveFields, drive.is_inches]);

  const downOrdinal = (d: 1 | 2 | 3 | 4) => (["1ST", "2ND", "3RD", "4TH"] as const)[d - 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
      <CompactGameStateBar key={`${drive.id}-${editPlay?.id ?? "log"}`} gameState={gameState}>
        {showPlaySnapControls || showSnapSpotEditor ? (
          <>
            {showPlaySnapControls ? (
              <>
            <div>
              <p className="app-field-label text-slate-500 dark:text-slate-500">Down</p>
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
                      {downOrdinal(d)}
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
                value={distanceStr}
                placeholder="10"
                onFocus={() => {
                  distanceFieldFocusedRef.current = true;
                }}
                onChange={(e) => {
                  distanceFieldFocusedRef.current = true;
                  setDistanceStr(e.target.value.replace(/\D/g, ""));
                }}
                onBlur={() => commitDistanceInput()}
              />
            </label>
            {gameState.distance <= 1 ? (
              <div>
                <p className="app-field-label text-slate-500 dark:text-slate-500">Short yardage</p>
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
              <p className="app-field-label text-slate-500 dark:text-slate-500">Down</p>
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
                      {downOrdinal(d)}
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
                value={distanceStr}
                placeholder="10"
                onFocus={() => {
                  distanceFieldFocusedRef.current = true;
                }}
                onChange={(e) => {
                  distanceFieldFocusedRef.current = true;
                  setDistanceStr(e.target.value.replace(/\D/g, ""));
                }}
                onBlur={() => commitDistanceInput()}
              />
            </label>
            {gameState.distance <= 1 ? (
              <div>
                <p className="app-field-label text-slate-500 dark:text-slate-500">Short yardage</p>
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
              </>
            ) : null}
          </>
        ) : null}
      </CompactGameStateBar>

      {plays.length > 0 || editPlay ? (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="app-field-label text-slate-500 dark:text-slate-500">FIELD POSITION</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
              ballAtSide === "OWN"
                ? "border border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                : "border border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
            }`}
            onClick={() => {
              const yParsed = parseInt(ballAtYard, 10);
              const curLos = fromAbsoluteYard(gameState.absoluteYard);
              const y = Number.isFinite(yParsed) && yParsed >= 1 && yParsed <= 50 ? yParsed : curLos.yard_line;
              setBallAtSide("OWN");
              patchSnapFieldPosition("OWN", y);
            }}
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
            onClick={() => {
              const yParsed = parseInt(ballAtYard, 10);
              const curLos = fromAbsoluteYard(gameState.absoluteYard);
              const y = Number.isFinite(yParsed) && yParsed >= 1 && yParsed <= 50 ? yParsed : curLos.yard_line;
              setBallAtSide("OPP");
              patchSnapFieldPosition("OPP", y);
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
            value={ballAtYard}
            onFocus={() => {
              snapYardFocusedRef.current = true;
            }}
            onChange={(e) => {
              snapYardFocusedRef.current = true;
              setBallAtYard(e.target.value.replace(/\D/g, ""));
            }}
            onBlur={() => {
              snapYardFocusedRef.current = false;
              const raw = ballAtYard.trim();
              const curLos = fromAbsoluteYard(gameState.absoluteYard);
              const n = raw === "" ? curLos.yard_line : Math.min(50, Math.max(1, parseInt(raw, 10) || curLos.yard_line));
              setBallAtYard(String(n));
              patchSnapFieldPosition(ballAtSide, n);
            }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-500">{formatFieldPosition(gameState.absoluteYard)}</p>
      </div>
      ) : null}

      {drivePossessionEnded ? (
        <div
          className="rounded-xl border border-amber-700/50 bg-amber-950/40 px-3 py-2 font-body text-sm text-amber-100 dark:border-amber-700/50"
          role="status"
        >
          Drive closed. Add a drive from the log to keep going.
        </div>
      ) : null}

          <div>
            <p className="app-field-label text-slate-500">SITUATION</p>
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
              <label className="app-field-label text-slate-500 dark:text-slate-500">
                Yards {uiResult === "GAIN" ? "gained" : "lost"}
              </label>
              <input
                ref={yardsRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={uiResult === "GAIN" ? "e.g. 8" : "e.g. 3"}
                value={yardsText}
                onChange={(e) => setYardsText(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center font-mono text-sm text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
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

      <div className="flex flex-shrink-0 flex-col gap-2 border-t border-slate-800 pt-3">
        {editPlay ? (
          <button type="button" className="btn-secondary-block w-full" onClick={() => onEditPlayChange(null)}>
            Cancel
          </button>
        ) : null}
        <button
          ref={logBtnRef}
          type="button"
          disabled={editPlay ? logging || !canSubmit : !canSubmit}
          className="btn-primary-block motion-safe:active:scale-[0.97] motion-safe:duration-100"
          onClick={() => void submitLog()}
        >
          {editPlay && logging ? "Saving…" : editPlay ? "Update play" : "Log play"}
        </button>
      </div>
    </div>
  );
}
