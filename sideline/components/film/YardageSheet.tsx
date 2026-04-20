"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { advanceGameState, type GameState, type ResultTag } from "@/lib/gameStateEngine";
import { deriveYards, formatFieldPosition, formatFieldPositionFromAbsolute, fromAbsoluteYard, parseFieldPosition } from "@/lib/fieldPosition";
import type { PlaybookEntry } from "@/lib/playbook";

type PlayResult = "INCOMPLETE" | "SACK" | "TURNOVER" | "PENALTY" | "TOUCHDOWN" | "PUNT" | "FIELD_GOAL" | "FG_MISS";

const VALID_PLAY_TYPES = ["RUN", "PASS", "RPO"] as const;
type NormalizedPlayType = (typeof VALID_PLAY_TYPES)[number];

function normalizedPlayType(raw: string | null | undefined): NormalizedPlayType {
  const u = (raw ?? "").trim().toUpperCase();
  if (VALID_PLAY_TYPES.includes(u as NormalizedPlayType)) return u as NormalizedPlayType;
  return "RUN";
}

function playTypeBadgeClass(type: NormalizedPlayType): string {
  if (type === "RUN") return "border-emerald-700/70 bg-emerald-900/30 text-emerald-300";
  if (type === "PASS") return "border-blue-700/70 bg-blue-900/30 text-blue-300";
  return "border-amber-700/70 bg-amber-900/30 text-amber-300";
}

interface YardageSheetProps {
  play: PlaybookEntry;
  currentGameState: GameState;
  onLog: (yards: number, result: PlayResult | null, endingFieldPos: number) => Promise<void>;
  onCancel: () => void;
}

export function YardageSheet({ play, currentGameState, onLog, onCancel }: YardageSheetProps) {
  const playType = normalizedPlayType(play.play_type);
  const startFP = currentGameState.absoluteYard;

  const [endSide, setEndSide] = useState<"OWN" | "OPP">("OWN");
  const [endYardStr, setEndYardStr] = useState("");
  const [result, setResult] = useState<PlayResult | null>(null);
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
  }, [play.play_name, play.formation, startFP]);

  const parsedEndYard = Number.parseInt(endYardStr.trim(), 10);
  const hasValidEndYard = !Number.isNaN(parsedEndYard) && parsedEndYard >= 1 && parsedEndYard <= 50;

  const endingAbs = useMemo(() => {
    if (!result) return startFP;
    if (result === "INCOMPLETE" || result === "FIELD_GOAL" || result === "FG_MISS") return startFP;
    if (result === "TOUCHDOWN") return 100;
    if (!hasValidEndYard) return startFP;
    return parseFieldPosition(endSide, parsedEndYard);
  }, [result, startFP, hasValidEndYard, endSide, parsedEndYard]);

  const derivedYards = useMemo(() => {
    if (!result) return null as number | null;
    if (result === "INCOMPLETE") return 0;
    if (result === "TOUCHDOWN") return 100 - Math.min(99, Math.max(1, Math.round(startFP)));
    if (result === "FIELD_GOAL" || result === "FG_MISS") return 0;
    if (!hasValidEndYard) return null;
    return deriveYards(startFP, endSide, parsedEndYard);
  }, [result, startFP, hasValidEndYard, endSide, parsedEndYard]);

  const inferredTag = useMemo<ResultTag>(() => {
    if (result === "PUNT") return "PUNT";
    if (result === "FIELD_GOAL") return "FIELD_GOAL";
    if (result === "FG_MISS") return "TURNOVER";
    if (result === "TURNOVER") return "TURNOVER";
    if (result === "TOUCHDOWN") return "TOUCHDOWN";
    if (result === "INCOMPLETE") return "INCOMPLETE";
    if (result === "SACK") return "LOSS";
    const y = derivedYards ?? 0;
    if (y < 0) return "LOSS";
    if (y === 0) return "NO_GAIN";
    return "GAIN";
  }, [result, derivedYards]);

  const needsSpot =
    result != null &&
    !["INCOMPLETE", "TOUCHDOWN", "FIELD_GOAL", "FG_MISS"].includes(result);

  const preview = useMemo(() => {
    if (!result) return "";
    if (needsSpot && (!hasValidEndYard || derivedYards === null)) {
      return "Enter ball spot to preview.";
    }
    const y = derivedYards ?? 0;
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
  }, [currentGameState, inferredTag, derivedYards, endingAbs, result, needsSpot, hasValidEndYard]);

  const canLog =
    result != null &&
    !busy &&
    (result === "INCOMPLETE" ||
      result === "TOUCHDOWN" ||
      result === "FIELD_GOAL" ||
      result === "FG_MISS" ||
      (needsSpot && hasValidEndYard && derivedYards !== null));

  const spotControlsDisabled = result === "INCOMPLETE" || result === "TOUCHDOWN";

  const yardsConfirmation = useMemo(() => {
    if (!result || result === "FIELD_GOAL" || result === "FG_MISS") return null;
    if (result === "INCOMPLETE") return null;
    if (result === "TOUCHDOWN") return <p className="font-mono text-[11px] text-emerald-400">Touchdown</p>;
    if (!hasValidEndYard && needsSpot) return null;
    const y = derivedYards ?? 0;
    if (y === 0) return <p className="font-mono text-[11px] text-slate-500">No gain</p>;
    if (y > 0) return <p className="font-mono text-[11px] text-emerald-400">{`+${y} yards`}</p>;
    return <p className="font-mono text-[11px] text-red-400">{`${y} yards`}</p>;
  }, [result, derivedYards, hasValidEndYard, needsSpot]);

  const spotLabelMono = useMemo(() => {
    if (result === "INCOMPLETE") return null;
    if (result === "TOUCHDOWN") return null;
    if (!hasValidEndYard && needsSpot) return null;
    return <p className="font-mono text-[11px] text-slate-500">{formatFieldPositionFromAbsolute(endingAbs)}</p>;
  }, [result, endingAbs, hasValidEndYard, needsSpot]);

  function logCtaLabel(): string {
    if (!result) return "Select result";
    if (!canLog && needsSpot) return "Enter ball spot";
    if (result === "TOUCHDOWN") return `Log ${play.play_name} · Touchdown`;
    if (result === "INCOMPLETE") return `Log ${play.play_name} · Incomplete`;
    if (result === "FIELD_GOAL") return `Log ${play.play_name} · FG Made`;
    if (result === "FG_MISS") return `Log ${play.play_name} · FG Miss`;
    return `Log ${play.play_name} · ${formatFieldPositionFromAbsolute(endingAbs)}`;
  }

  async function submit() {
    if (!canLog || busy) return;
    setBusy(true);
    try {
      await onLog(derivedYards ?? 0, result, endingAbs);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full border-t border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex min-h-[44px] items-center">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 font-sans text-sm text-slate-300"
        >
          Back
        </button>
      </div>

      <div className="mb-4 border-b border-slate-700 pb-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-slate-500">Logging Play</p>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-100">{play.play_name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-500">{play.formation}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${playTypeBadgeClass(playType)}`}
          >
            {playType}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ball spotted at</p>
        {result === "INCOMPLETE" ? (
          <p className="mt-2 font-sans text-sm text-slate-400">No gain — line of scrimmage</p>
        ) : result === "TOUCHDOWN" ? (
          <p className="mt-2 font-mono text-xs text-slate-400">{formatFieldPosition(startFP)} → end zone</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-stretch gap-2">
              <button
                type="button"
                disabled={spotControlsDisabled}
                className={`min-h-11 flex-1 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                disabled={spotControlsDisabled}
                className={`min-h-11 flex-1 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  endSide === "OPP"
                    ? "border-transparent bg-emerald-600 text-slate-100"
                    : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
                }`}
                onClick={() => setEndSide("OPP")}
              >
                OPP
              </button>
              <label className="min-h-11 min-w-[5rem] flex-1">
                <span className="sr-only">Yard line 1 to 50</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={spotControlsDisabled}
                  className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  value={endYardStr}
                  onChange={(e) => setEndYardStr(e.target.value)}
                />
              </label>
            </div>
            {spotLabelMono ? <div className="mt-2">{spotLabelMono}</div> : null}
            {yardsConfirmation ? <div className="mt-1">{yardsConfirmation}</div> : null}
          </>
        )}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase text-slate-500">Result</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {(
          [
            ["INCOMPLETE", "Incomplete"],
            ["SACK", "Sack"],
            ["TURNOVER", "Turnover"],
            ["PENALTY", "Penalty"],
            ["TOUCHDOWN", "TD"],
            ["PUNT", "Punt"],
            ["FIELD_GOAL", "FG Made"],
            ["FG_MISS", "FG Miss"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`min-h-11 rounded-lg border px-2 font-sans text-xs ${result === value ? "border-amber-600 bg-amber-900/30 text-amber-200" : "border-slate-700 text-slate-300"}`}
            onClick={() => {
              setResult(value);
              if (value === "INCOMPLETE") {
                const { side, yard_line } = fromAbsoluteYard(startFP);
                setEndSide(side);
                setEndYardStr(String(yard_line));
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!canLog || busy}
        className={`mt-4 min-h-11 w-full rounded-lg border px-3 font-sans text-sm font-semibold ${
          canLog ? "border-transparent bg-emerald-600 text-slate-100" : "border-slate-700 text-slate-500"
        }`}
        onClick={() => void submit()}
      >
        {logCtaLabel()}
      </button>
      <p className="mt-1 text-center font-mono text-[10px] text-slate-500">{preview}</p>
    </div>
  );
}

export type { PlayResult };
