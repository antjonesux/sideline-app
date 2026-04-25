"use client";

import { useEffect, useState } from "react";
import type { Drive } from "@/lib/types";
import { formatFieldPosition, parseFieldPosition } from "@/lib/fieldPosition";

type Props = {
  drive: Drive;
  onPersist: (partial: Pick<Drive, "starting_side" | "starting_yard_line">) => void;
};

/** Starting line for the drive — same OWN/OPP + yard pattern as the play logger; lives on the game log drive accordion. */
export function DriveStartingFieldPanel({ drive, onPersist }: Props) {
  const playCount = drive.plays?.length ?? 0;
  const side = drive.starting_side === "OPP" ? "OPP" : "OWN";
  const y0 =
    typeof drive.starting_yard_line === "number" && drive.starting_yard_line >= 1 && drive.starting_yard_line <= 50
      ? drive.starting_yard_line
      : 25;
  const [yardStr, setYardStr] = useState(String(y0));
  const [localSide, setLocalSide] = useState<"OWN" | "OPP">(side);

  useEffect(() => {
    setLocalSide(drive.starting_side === "OPP" ? "OPP" : "OWN");
    const nextY =
      typeof drive.starting_yard_line === "number" &&
      drive.starting_yard_line >= 1 &&
      drive.starting_yard_line <= 50
        ? drive.starting_yard_line
        : 25;
    setYardStr(String(nextY));
  }, [drive.id, drive.starting_side, drive.starting_yard_line]);

  function commitYard(nextSide: "OWN" | "OPP", rawYard: string) {
    const n = Math.min(50, Math.max(1, parseInt(rawYard.trim(), 10) || y0));
    setYardStr(String(n));
    onPersist({ starting_side: nextSide, starting_yard_line: n });
  }

  const openingAbs =
    typeof drive.starting_yard_line === "number" &&
    drive.starting_yard_line >= 1 &&
    drive.starting_yard_line <= 50 &&
    (drive.starting_side === "OWN" || drive.starting_side === "OPP")
      ? parseFieldPosition(drive.starting_side, drive.starting_yard_line)
      : null;

  if (playCount > 0) {
    return (
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
        <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Starting field</p>
        <p className="font-mono text-sm text-slate-200">
          {openingAbs != null ? formatFieldPosition(openingAbs) : <span className="text-slate-500">—</span>}
        </p>
        <p className="mt-1 font-body text-xs text-slate-500">Use the play logger to change the line of scrimmage on later snaps.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-3">
      <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Field position (drive start)</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
            localSide === "OWN"
              ? "border border-transparent bg-emerald-600 text-white"
              : "border border-slate-700 text-slate-400"
          }`}
          onClick={() => {
            setLocalSide("OWN");
            commitYard("OWN", yardStr);
          }}
        >
          OWN
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
            localSide === "OPP"
              ? "border border-transparent bg-emerald-600 text-white"
              : "border border-slate-700 text-slate-400"
          }`}
          onClick={() => {
            setLocalSide("OPP");
            commitYard("OPP", yardStr);
          }}
        >
          OPP
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Yard line 1 to 50"
          className="min-h-11 min-w-[5rem] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center font-mono text-sm text-white"
          value={yardStr}
          onChange={(e) => setYardStr(e.target.value.replace(/\D/g, ""))}
          onBlur={() => commitYard(localSide, yardStr)}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-slate-500">
        {formatFieldPosition(parseFieldPosition(localSide, Math.min(50, Math.max(1, parseInt(yardStr, 10) || y0))))}
      </p>
    </div>
  );
}
