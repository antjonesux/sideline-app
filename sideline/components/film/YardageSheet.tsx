"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { advanceGameState, type GameState, type ResultTag } from "@/lib/gameStateEngine";
import { deriveYards, formatFieldPosition, fromAbsoluteYard, parseFieldPosition } from "@/lib/fieldPosition";
import type { PlaybookEntry } from "@/lib/playbook";
import {
  FILM_LOGGER_SPECIAL_TEAMS_BADGE_CLASS,
  isFilmLoggerPuntEntry,
  isFilmLoggerSpecialTeamsEntry,
} from "@/lib/filmLoggerSpecialTeams";
import { startCriticalFlow } from "@/lib/perfInstrumentation";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { ONBOARDING_BALL_SPOT_HELPER } from "@/lib/coachCopy";

type PlayResult = "INCOMPLETE" | "SACK" | "TURNOVER" | "PENALTY" | "TOUCHDOWN" | "PUNT" | "FIELD_GOAL" | "FG_MISS";

const VALID_PLAY_TYPES = ["RUN", "PASS", "RPO"] as const;
type NormalizedPlayType = (typeof VALID_PLAY_TYPES)[number];

function normalizedPlayType(raw: string | null | undefined): NormalizedPlayType {
  const u = (raw ?? "").trim().toUpperCase();
  if (VALID_PLAY_TYPES.includes(u as NormalizedPlayType)) return u as NormalizedPlayType;
  return "RUN";
}

function canonicalPlayTypeBadgeClass(type: NormalizedPlayType): string {
  if (type === "RUN") return "border-emerald-700/70 bg-emerald-900/30 text-emerald-300";
  if (type === "PASS") return "border-blue-700/70 bg-blue-900/30 text-blue-300";
  return "border-amber-700/70 bg-amber-900/30 text-amber-300";
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function computeEndFP(side: "OWN" | "OPP", yard: number): number {
  return side === "OWN" ? yard : 100 - yard;
}

function computeDelta(startFP: number, endFP: number): number {
  return endFP - startFP;
}

/** Past the goal plane in the same 1–99 absolute encoding as `toAbsoluteYard` / `yardsToEndZone` (goal line = 100). */
const END_ZONE_FP = 100;

type PlayOutcome = "gain" | "loss" | "no_gain";

function deriveOutcome(delta: number | null): PlayOutcome | null {
  if (delta === null) return null;
  if (delta > 0) return "gain";
  if (delta < 0) return "loss";
  return "no_gain";
}

type SheetResultKey =
  | "Incomplete"
  | "Sack"
  | "Turnover"
  | "Penalty"
  | "TD"
  | "Punt"
  | "FG Made"
  | "FG Miss";

const RESULT_AVAILABILITY: Record<SheetResultKey, Record<PlayOutcome, boolean>> = {
  Incomplete: { gain: false, loss: false, no_gain: true },
  Sack: { gain: false, loss: true, no_gain: true },
  Turnover: { gain: true, loss: true, no_gain: true },
  Penalty: { gain: true, loss: true, no_gain: true },
  TD: { gain: true, loss: true, no_gain: true },
  Punt: { gain: false, loss: false, no_gain: false },
  "FG Made": { gain: false, loss: false, no_gain: false },
  "FG Miss": { gain: false, loss: false, no_gain: false },
};

const DRIVE_ENDERS = ["Punt", "FG Made", "FG Miss"] as const satisfies readonly SheetResultKey[];
type DriveEnderKey = (typeof DRIVE_ENDERS)[number];

function isDriveEnderKey(key: string): key is DriveEnderKey {
  return (DRIVE_ENDERS as readonly string[]).includes(key);
}

function isResultAvailable(resultKey: string, outcome: PlayOutcome | null, inputProvided: boolean): boolean {
  if (isDriveEnderKey(resultKey)) {
    return inputProvided;
  }
  if (!inputProvided || outcome === null) return false;
  return RESULT_AVAILABILITY[resultKey as SheetResultKey]?.[outcome] ?? false;
}

const SPECIALS = [
  { label: "Incomplete", key: "Incomplete" as const, playResult: "INCOMPLETE" as const, colorClass: "slate-400" as const },
  { label: "Sack", key: "Sack" as const, playResult: "SACK" as const, colorClass: "red-400" as const },
  { label: "Turnover", key: "Turnover" as const, playResult: "TURNOVER" as const, colorClass: "red-400" as const },
  { label: "Penalty", key: "Penalty" as const, playResult: "PENALTY" as const, colorClass: "amber-400" as const },
  { label: "TD", key: "TD" as const, playResult: "TOUCHDOWN" as const, colorClass: "emerald-400" as const },
  { label: "Punt", key: "Punt" as const, playResult: "PUNT" as const, colorClass: "slate-400" as const },
  { label: "FG Made", key: "FG Made" as const, playResult: "FIELD_GOAL" as const, colorClass: "emerald-400" as const },
  { label: "FG Miss", key: "FG Miss" as const, playResult: "FG_MISS" as const, colorClass: "red-400" as const },
] as const;

const RESULT_ACTIVE_CLASSES: Record<(typeof SPECIALS)[number]["colorClass"], string> = {
  "slate-400": "border-2 border-slate-400 bg-slate-400/20 text-slate-400",
  "red-400": "border-2 border-red-400 bg-red-400/20 text-red-400",
  "amber-400": "border-2 border-amber-400 bg-amber-400/20 text-amber-400",
  "emerald-400": "border-2 border-emerald-400 bg-emerald-400/20 text-emerald-400",
};

function sheetKeyForPlayResult(r: PlayResult): SheetResultKey {
  switch (r) {
    case "INCOMPLETE":
      return "Incomplete";
    case "SACK":
      return "Sack";
    case "TURNOVER":
      return "Turnover";
    case "PENALTY":
      return "Penalty";
    case "TOUCHDOWN":
      return "TD";
    case "PUNT":
      return "Punt";
    case "FIELD_GOAL":
      return "FG Made";
    case "FG_MISS":
      return "FG Miss";
  }
}

interface YardageSheetProps {
  play: PlaybookEntry;
  currentGameState: GameState;
  onLog: (yards: number, result: PlayResult | null, endingFieldPos: number, submitFlowId?: string) => Promise<void>;
  onCancel: () => void;
  /** Guided onboarding: short coach copy above ball-spot controls only. */
  onboardingSpotHelper?: boolean;
}

export function YardageSheet({ play, currentGameState, onLog, onCancel, onboardingSpotHelper }: YardageSheetProps) {
  const filmSt = isFilmLoggerSpecialTeamsEntry(play);
  const playType = normalizedPlayType(play.play_type);
  const startFP = currentGameState.absoluteYard;

  const [endSide, setEndSide] = useState<"OWN" | "OPP">("OWN");
  const [endYardStr, setEndYardStr] = useState("");
  const [selectedResult, setSelectedResult] = useState<PlayResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.history.pushState({ filmOverlay: "yards-sheet" }, "");
    const onPop = () => onCancel();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onCancel]);

  useEffect(() => {
    const { side, yard_line } = fromAbsoluteYard(startFP);
    setEndSide(side);
    setEndYardStr(String(yard_line));
    if (isFilmLoggerPuntEntry(play)) {
      setSelectedResult("PUNT");
    } else {
      setSelectedResult(null);
    }
  }, [play.play_id, play.play_name, play.formation, startFP]);

  const parsedEndYard = Number.parseInt(endYardStr.trim(), 10);
  const endYardNum = !Number.isNaN(parsedEndYard) && parsedEndYard >= 1 && parsedEndYard <= 50 ? parsedEndYard : null;
  const inputProvided = endYardNum !== null;
  const endFP = endYardNum !== null ? computeEndFP(endSide, endYardNum) : null;
  // When TD is selected, the play ends in the end zone. `endFP` from input is the snap / ball
  // spot, not the scoring plane — override so yards and logged ending position are correct.
  const effectiveEndFP =
    selectedResult === "TOUCHDOWN" && endFP !== null ? END_ZONE_FP : endFP;
  const spotDelta =
    effectiveEndFP !== null ? computeDelta(startFP, effectiveEndFP) : null;
  const outcome = deriveOutcome(spotDelta);
  const displayYards = spotDelta;

  useEffect(() => {
    if (selectedResult && !isResultAvailable(sheetKeyForPlayResult(selectedResult), outcome, inputProvided)) {
      setSelectedResult(null);
    }
  }, [outcome, inputProvided, selectedResult]);

  const endingAbs = useMemo(() => {
    if (selectedResult === "INCOMPLETE" || selectedResult === "FIELD_GOAL" || selectedResult === "FG_MISS") return startFP;
    if (!inputProvided) return startFP;
    return parseFieldPosition(endSide, endYardNum!);
  }, [selectedResult, startFP, inputProvided, endSide, endYardNum]);

  const derivedYards = useMemo(() => {
    if (!inputProvided || endYardNum === null) return null as number | null;
    if (selectedResult === "INCOMPLETE") return 0;
    if (selectedResult === "FIELD_GOAL" || selectedResult === "FG_MISS") return 0;
    if (selectedResult === "TOUCHDOWN") return spotDelta;
    return deriveYards(startFP, endSide, endYardNum);
  }, [selectedResult, startFP, inputProvided, endSide, endYardNum, spotDelta]);

  const inferredTag = useMemo<ResultTag>(() => {
    if (selectedResult === "PUNT") return "PUNT";
    if (selectedResult === "FIELD_GOAL") return "FIELD_GOAL";
    if (selectedResult === "FG_MISS") return "TURNOVER";
    if (selectedResult === "TURNOVER") return "TURNOVER";
    if (selectedResult === "TOUCHDOWN") return "TOUCHDOWN";
    if (selectedResult === "INCOMPLETE") return "INCOMPLETE";
    if (selectedResult === "SACK") return "LOSS";
    const y = derivedYards ?? spotDelta ?? 0;
    if (y < 0) return "LOSS";
    if (y === 0) return "NO_GAIN";
    return "GAIN";
  }, [selectedResult, derivedYards, spotDelta]);

  const needsSpot =
    selectedResult != null &&
    !["INCOMPLETE", "TOUCHDOWN", "FIELD_GOAL", "FG_MISS"].includes(selectedResult);

  const preview = useMemo(() => {
    if (!inputProvided) return "";
    if (needsSpot && (derivedYards === null || !inputProvided)) {
      return "Enter ball spot to preview.";
    }
    const y = derivedYards ?? spotDelta ?? 0;
    const advanceYards = inferredTag === "LOSS" ? Math.abs(y) : Math.max(0, y);
    let next = advanceGameState(currentGameState, inferredTag, advanceYards);
    if (inferredTag === "GAIN" || inferredTag === "LOSS" || inferredTag === "NO_GAIN") {
      const target = endingAbs;
      if (Math.abs(next.absoluteYard - target) > 0) {
        next = { ...next, absoluteYard: target };
      }
    }
    const downTxt = next.down === 1 ? "1st" : next.down === 2 ? "2nd" : next.down === 3 ? "3rd" : "4th";
    return `Next: ${downTxt} & ${next.distance} · ${formatFieldPosition(next.absoluteYard)}`;
  }, [currentGameState, inferredTag, derivedYards, spotDelta, endingAbs, needsSpot, inputProvided]);

  const logReady = inputProvided && !busy;

  function yardsForSubmit(): number {
    if (!inputProvided || endYardNum === null) return 0;
    const d = spotDelta ?? 0;
    if (!selectedResult) return d;
    if (selectedResult === "INCOMPLETE") return 0;
    if (selectedResult === "FIELD_GOAL" || selectedResult === "FG_MISS") return 0;
    if (selectedResult === "PUNT") return Math.max(0, d);
    if (selectedResult === "TOUCHDOWN") return spotDelta ?? 0;
    return d;
  }

  function endingFieldForSubmit(): number {
    return effectiveEndFP ?? startFP;
  }

  function logCtaLabel(): string {
    if (!logReady) return "Select result";
    return `Log ${play.play_name} · ${endSide} ${endYardNum ?? endYardStr}`;
  }

  function onResultButton(play: PlayResult, available: boolean) {
    if (!available) return;
    const active = selectedResult === play;

    if (active) {
      setSelectedResult(null);
      return;
    }

    if (play === "INCOMPLETE") {
      const { side, yard_line } = fromAbsoluteYard(startFP);
      setEndSide(side);
      setEndYardStr(String(yard_line));
    }

    setSelectedResult(play);
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
      await onLog(yardsForSubmit(), selectedResult, endingFieldForSubmit(), submitFlowId);
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
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${
              filmSt ? FILM_LOGGER_SPECIAL_TEAMS_BADGE_CLASS : canonicalPlayTypeBadgeClass(playType)
            }`}
          >
            {filmSt ? "Special Teams" : playType}
          </span>
        </div>
      </div>

      <div className="mt-3">
        {onboardingSpotHelper ? (
          <p className="mb-3 rounded-lg border border-sky-900/50 bg-sky-950/30 px-3 py-2 font-body text-sm leading-snug text-sky-100/95">
            {ONBOARDING_BALL_SPOT_HELPER}
          </p>
        ) : null}
        <p className="text-xs font-semibold font-mono text-slate-500 uppercase tracking-widest">BALL SPOTTED AT</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={`min-h-[44px] flex-1 rounded-lg border text-sm font-semibold transition-colors ${
              endSide === "OWN"
                ? "border-transparent bg-emerald-600 text-slate-100"
                : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => setEndSide("OWN")}
          >
            OWN
          </button>
          <button
            type="button"
            className={`min-h-[44px] flex-1 rounded-lg border text-sm font-semibold transition-colors ${
              endSide === "OPP"
                ? "border-transparent bg-emerald-600 text-slate-100"
                : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => setEndSide("OPP")}
          >
            OPP
          </button>
          <label className="flex min-h-[44px] min-w-0 flex-1">
            <span className="sr-only">Yard line 1 to 50</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              className="min-h-[44px] w-full flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center font-mono text-xl font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={endYardStr}
              onChange={(e) => setEndYardStr(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>
        {endYardNum !== null ? (
          <div className="mt-1 mb-3 font-mono text-xs text-slate-400">
            {displayYards === 0 ? "No gain — line of scrimmage" : null}
            {displayYards !== null && displayYards > 0 ? (
              <span className="text-emerald-400">{`+${displayYards} yards`}</span>
            ) : null}
            {displayYards !== null && displayYards < 0 ? (
              <span className="text-red-400">{`${displayYards} yards`}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold font-mono text-slate-500 uppercase tracking-widest">RESULT</p>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SPECIALS.map((s) => {
          const available = isResultAvailable(s.key, outcome, inputProvided);
          const active = selectedResult === s.playResult;
          return (
            <button
              key={s.key}
              type="button"
              disabled={!available}
              onClick={() => onResultButton(s.playResult, available)}
              className={cn(
                "min-h-[44px] w-full flex-1 rounded-lg border px-2 py-2.5 font-mono text-xs font-semibold whitespace-nowrap transition-colors",
                active ? RESULT_ACTIVE_CLASSES[s.colorClass] : available
                  ? "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
                  : "border-slate-800 bg-transparent text-slate-600 opacity-50 cursor-not-allowed",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!logReady}
        className={cn(
          "mt-4 w-full rounded-lg py-3 text-sm font-semibold transition-all min-h-[44px]",
          logReady ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-slate-800 text-slate-600 cursor-not-allowed",
        )}
        onClick={() => void submit()}
      >
        {logCtaLabel()}
      </button>
      <p className="mt-1 text-center font-mono text-[10px] text-slate-500">{preview}</p>
    </div>
  );
}

export type { PlayResult };
