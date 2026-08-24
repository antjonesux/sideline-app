"use client";

import {
  DEFENSIVE_RESULT_TAG_LABELS,
  SELECTABLE_DEFENSIVE_RESULT_TAGS,
  toggleDefensiveResultTag,
  type DefensiveResultTag,
} from "@/lib/defensiveResultTags";

const toggleOn = "border-2 border-emerald-400 bg-emerald-400/20 text-emerald-400";
const toggleOff = "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500";

type DefensiveResultTagPickerProps = {
  selected: DefensiveResultTag[];
  onChange: (next: DefensiveResultTag[]) => void;
};

export function DefensiveResultTagPicker({ selected, onChange }: DefensiveResultTagPickerProps) {
  function toggle(tag: DefensiveResultTag) {
    onChange(toggleDefensiveResultTag(selected, tag));
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SELECTABLE_DEFENSIVE_RESULT_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(tag)}
            className={`min-h-[44px] w-full rounded-lg border px-2 py-2.5 font-mono text-xs font-semibold whitespace-nowrap transition-colors ${
              active ? toggleOn : toggleOff
            }`}
          >
            {DEFENSIVE_RESULT_TAG_LABELS[tag]}
          </button>
        );
      })}
    </div>
  );
}
