"use client";

import { IconBackButton } from "@/components/shared/IconBackButton";
import type { ConversionResultOption, ConversionScenario } from "@/lib/filmConversionResults";
import { conversionResultOptionsForScenario } from "@/lib/filmConversionResults";
import type { PlaybookEntry } from "@/lib/playbook";
import { useState } from "react";

type ConversionAttemptSheetProps = {
  scenario: ConversionScenario;
  play: PlaybookEntry;
  busy?: boolean;
  onLog: (storedTag: string) => Promise<void>;
  onCancel: () => void;
};

const ACTIVE_CLASS =
  "border-2 border-emerald-400 bg-emerald-400/20 text-emerald-400";

export function ConversionAttemptSheet({
  scenario,
  play,
  busy = false,
  onLog,
  onCancel,
}: ConversionAttemptSheetProps) {
  const options = conversionResultOptionsForScenario(scenario) ?? [];
  const [selected, setSelected] = useState<ConversionResultOption | null>(null);

  const title = scenario === "XP" ? "Extra point" : "Two-point attempt";
  const helper =
    scenario === "XP"
      ? "Log whether the extra point was good."
      : "Log whether the two-point conversion succeeded.";

  async function submit() {
    if (!selected || busy) return;
    await onLog(selected.storedTag);
  }

  return (
    <div className="w-full border-t border-slate-800 bg-slate-900 px-4 pb-4 pt-3">
      <div className="mb-3 flex min-h-[44px] items-center">
        <IconBackButton aria-label="Back" onClick={onCancel} />
      </div>

      <div className="mb-4 border-b border-slate-700 pb-4">
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
        <p className="text-lg font-bold text-slate-100">{play.play_name}</p>
        <p className="mt-0.5 font-mono text-xs text-slate-500">{play.formation}</p>
        <p className="mt-2 font-body text-sm text-slate-400">{helper}</p>
      </div>

      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">Result</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = selected?.storedTag === opt.storedTag;
          return (
            <button
              key={opt.storedTag}
              type="button"
              disabled={busy}
              onClick={() => setSelected(active ? null : opt)}
              className={`min-h-11 rounded-lg border px-3 py-3 font-sans text-sm font-semibold transition-colors ${
                active
                  ? ACTIVE_CLASS
                  : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected || busy}
        onClick={() => void submit()}
        className={`mt-4 w-full min-h-[44px] rounded-lg py-3 text-sm font-semibold transition-all ${
          selected && !busy
            ? "bg-emerald-500 text-black hover:bg-emerald-400"
            : "cursor-not-allowed bg-slate-800 text-slate-600"
        }`}
      >
        {selected ? `Log ${selected.label}` : "Select result"}
      </button>
    </div>
  );
}
