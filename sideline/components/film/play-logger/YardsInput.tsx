"use client";

import type { UiResultTag } from "@/lib/gameStateEngine";
import React, { useId } from "react";

type YardsInputProps = {
  uiResult: UiResultTag | null;
  yardsText: string;
  onYardsTextChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function YardsInput({ uiResult, yardsText, onYardsTextChange, inputRef }: YardsInputProps) {
  const id = useId();
  const innerRef = React.useRef<HTMLInputElement>(null);
  const ref = inputRef ?? innerRef;
  const show =
    uiResult === "GAIN" ||
    uiResult === "TOUCHDOWN" ||
    uiResult === "LOSS";

  if (!show) return null;

  const isLoss = uiResult === "LOSS";

  return (
    <div
      className={`motion-safe:transition-opacity motion-safe:duration-150 motion-reduce:transition-none ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <label htmlFor={id} className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
        Yards
      </label>
      <div
        className={`mt-1.5 flex min-h-11 items-center rounded-lg border border-slate-700 bg-slate-800 ${isLoss ? "pl-3" : ""}`}
      >
        {isLoss ? (
          <span className="font-mono text-2xl font-medium text-red-300" aria-hidden>
            −
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={2}
          aria-label={isLoss ? "Yards lost (positive number)" : "Yards"}
          className="min-h-11 w-full rounded-lg border-0 bg-transparent px-3 text-center font-mono text-2xl text-white focus:ring-0"
          value={yardsText}
          onChange={(e) => onYardsTextChange(e.target.value.replace(/\D/g, ""))}
        />
      </div>
    </div>
  );
}
