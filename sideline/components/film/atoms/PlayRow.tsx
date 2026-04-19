"use client";

import type { PlaybookEntry } from "@/lib/playbook";

interface PlayRowProps {
  play: PlaybookEntry;
  onSelect: (play: PlaybookEntry) => void;
}

function badgeClass(type: PlaybookEntry["play_type"]): string {
  if (type === "RUN") return "border-emerald-700/70 bg-emerald-900/30 text-emerald-300";
  if (type === "PASS") return "border-blue-700/70 bg-blue-900/30 text-blue-300";
  if (type === "RPO") return "border-amber-700/70 bg-amber-900/30 text-amber-300";
  return "border-slate-700 bg-slate-800 text-slate-300";
}

export function PlayRow({ play, onSelect }: PlayRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(play)}
      className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-left"
    >
      <span
        className={`h-8 w-[3px] shrink-0 rounded ${
          play.play_type === "RUN" ? "bg-emerald-500" : play.play_type === "PASS" ? "bg-blue-500" : "bg-amber-500"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-[13px] font-semibold text-slate-100">{play.play_name}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-slate-500">{play.formation}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${badgeClass(play.play_type)}`}>
        {play.play_type}
      </span>
    </button>
  );
}
