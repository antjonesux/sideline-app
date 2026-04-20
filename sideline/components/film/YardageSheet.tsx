"use client";

import { useEffect, useMemo, useState } from "react";
import { advanceGameState, type GameState, type ResultTag } from "@/lib/gameStateEngine";
import { formatFieldPosition } from "@/lib/fieldPosition";
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
  onLog: (yards: number, result: PlayResult | null) => Promise<void>;
  onCancel: () => void;
}

const CHIPS = [-5, -2, 0, 3, 5, 8, 12, 20];

export function YardageSheet({ play, currentGameState, onLog, onCancel }: YardageSheetProps) {
  const playType = normalizedPlayType(play.play_type);
  const [yards, setYards] = useState<number | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [directInput, setDirectInput] = useState(false);
  const [directValue, setDirectValue] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedChip = yards != null && CHIPS.includes(yards) ? yards : null;

  useEffect(() => {
    window.history.pushState({ filmOverlay: "yards-sheet" }, "");
    const onPop = () => onCancel();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onCancel]);

  useEffect(() => {
    if (result === "INCOMPLETE") setYards(0);
  }, [result]);

  const inferredTag = useMemo<ResultTag>(() => {
    if (result === "PUNT") return "PUNT";
    if (result === "FIELD_GOAL") return "FIELD_GOAL";
    if (result === "FG_MISS") return "TURNOVER";
    if (result === "TURNOVER") return "TURNOVER";
    if (result === "TOUCHDOWN") return "TOUCHDOWN";
    if (result === "INCOMPLETE") return "INCOMPLETE";
    if (result === "SACK") return "LOSS";
    if ((yards ?? 0) < 0) return "LOSS";
    if ((yards ?? 0) === 0) return "NO_GAIN";
    return "GAIN";
  }, [result, yards]);

  const preview = useMemo(() => {
    const next = advanceGameState(currentGameState, inferredTag, Math.abs(yards ?? 0));
    const downTxt = next.down === 1 ? "1st" : next.down === 2 ? "2nd" : next.down === 3 ? "3rd" : "4th";
    return `Next: ${downTxt} & ${next.distance} · ${formatFieldPosition(next.absoluteYard)}`;
  }, [currentGameState, inferredTag, yards]);

  const canLog = result === "PUNT" || result === "FIELD_GOAL" || result === "FG_MISS" || yards != null;

  async function submit() {
    if (!canLog || busy) return;
    setBusy(true);
    try {
      await onLog(yards ?? 0, result);
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
            <p className="text-lg font-bold text-white">{play.play_name}</p>
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
        {result !== "INCOMPLETE" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => {
                const active = yards === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    className={`min-h-11 rounded-lg border px-2 font-mono text-xs ${
                      active
                        ? chip < 0
                          ? "border-red-600 bg-red-900/40 text-red-400"
                          : "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                        : "border-slate-700 text-slate-300"
                    }`}
                    onClick={() => setYards(chip)}
                  >
                    {chip > 0 ? `+${chip}` : chip}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="min-h-11 min-w-11 rounded-lg border border-slate-700 text-lg text-slate-200" onClick={() => setYards((yards ?? 0) - 1)}>
                −
              </button>
              {directInput ? (
                <input
                  type="number"
                  autoFocus
                  value={directValue}
                  onChange={(e) => setDirectValue(e.target.value)}
                  onBlur={() => {
                    const parsed = Number.parseInt(directValue, 10);
                    setYards(Number.isNaN(parsed) ? 0 : parsed);
                    setDirectInput(false);
                  }}
                  className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono text-white"
                />
              ) : (
                <button type="button" className="min-h-11 flex-1 rounded-lg border border-slate-700 font-mono text-white" onClick={() => {
                  setDirectValue(String(yards ?? 0));
                  setDirectInput(true);
                }}>
                  {yards ?? "Yards"}
                </button>
              )}
              <button type="button" className="min-h-11 min-w-11 rounded-lg border border-slate-700 text-lg text-slate-200" onClick={() => setYards((yards ?? 0) + 1)}>
                +
              </button>
            </div>
            {selectedChip == null && yards != null ? (
              <p className="mt-1 font-mono text-[10px] text-slate-500">Custom yards: {yards >= 0 ? "+" : ""}{yards}</p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 font-sans text-sm text-slate-400">No yards gained</p>
        )}
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase text-slate-500">Result</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[
          ["INCOMPLETE", "Incomplete"],
          ["SACK", "Sack"],
          ["TURNOVER", "Turnover"],
          ["PENALTY", "Penalty"],
          ["TOUCHDOWN", "TD"],
          ["PUNT", "Punt"],
          ["FIELD_GOAL", "FG Made"],
          ["FG_MISS", "FG Miss"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`min-h-11 rounded-lg border px-2 font-sans text-xs ${result === value ? "border-amber-600 bg-amber-900/30 text-amber-200" : "border-slate-700 text-slate-300"}`}
            onClick={() => setResult(value as PlayResult)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!canLog || busy}
        className={`mt-4 min-h-11 w-full rounded-lg border px-3 font-sans text-sm font-semibold ${
          canLog ? "border-transparent bg-emerald-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.25)]" : "border-slate-700 text-slate-500"
        }`}
        onClick={() => void submit()}
      >
        {canLog ? `Log ${play.play_name} ${yards != null ? `${yards >= 0 ? "+" : ""}${yards}` : ""}` : "Select yardage"}
      </button>
      <p className="mt-1 text-center font-mono text-[10px] text-slate-500">{preview}</p>
    </div>
  );
}

export type { PlayResult };
