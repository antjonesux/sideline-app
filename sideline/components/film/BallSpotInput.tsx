"use client";

import { useEffect, useState } from "react";
import { fromAbsoluteYard } from "@/lib/fieldPosition";

function computeEndFP(side: "OWN" | "OPP", yard: number): number {
  return side === "OWN" ? yard : 100 - yard;
}

function computeDelta(startFP: number, endFP: number): number {
  return endFP - startFP;
}

type UseBallSpotInputArgs = {
  startFP: number;
  /** Reset ball-spot controls when the selected play changes. */
  resetKey: string;
};

export function useBallSpotInput({ startFP, resetKey }: UseBallSpotInputArgs) {
  const [endSide, setEndSide] = useState<"OWN" | "OPP">("OWN");
  const [endYardStr, setEndYardStr] = useState("");

  useEffect(() => {
    const { side, yard_line } = fromAbsoluteYard(startFP);
    setEndSide(side);
    setEndYardStr(String(yard_line));
  }, [resetKey, startFP]);

  const parsedEndYard = Number.parseInt(endYardStr.trim(), 10);
  const endYardNum = !Number.isNaN(parsedEndYard) && parsedEndYard >= 1 && parsedEndYard <= 50 ? parsedEndYard : null;
  const endFP = endYardNum !== null ? computeEndFP(endSide, endYardNum) : null;
  const spotDelta = endFP !== null ? computeDelta(startFP, endFP) : null;
  const inputProvided = endYardNum !== null;

  return {
    endSide,
    setEndSide,
    endYardStr,
    setEndYardStr,
    endYardNum,
    endFP,
    spotDelta,
    displayYards: spotDelta,
    inputProvided,
  };
}

type BallSpotControlsProps = {
  endSide: "OWN" | "OPP";
  setEndSide: (side: "OWN" | "OPP") => void;
  endYardStr: string;
  setEndYardStr: (value: string) => void;
  endYardNum: number | null;
  displayYards: number | null;
  onboardingSpotHelper?: boolean;
  onboardingCopy?: string;
};

export function BallSpotControls({
  endSide,
  setEndSide,
  endYardStr,
  setEndYardStr,
  endYardNum,
  displayYards,
  onboardingSpotHelper,
  onboardingCopy,
}: BallSpotControlsProps) {
  return (
    <div className="mt-3">
      {onboardingSpotHelper && onboardingCopy ? (
        <p className="mb-3 rounded-lg border border-sky-900/50 bg-sky-950/30 px-3 py-2 font-body text-sm leading-snug text-sky-100/95">
          {onboardingCopy}
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
  );
}

export { computeEndFP, computeDelta };
