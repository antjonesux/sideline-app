"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { LoggedPlay } from "@/lib/types";
import { formatPlaySnapDnDist } from "@/lib/formatDownDistance";
import { formatFieldPosition, toAbsoluteYard } from "@/lib/fieldPosition";
import { normalizePlayName } from "@/lib/utils";

function yardsDisplay(y: number): string {
  if (y > 0) return `+${y.toLocaleString("en-US")}`;
  return y.toLocaleString("en-US");
}

function yardsClass(y: number): string {
  if (y > 0) return "text-emerald-400";
  if (y < 0) return "text-red-400";
  return "text-slate-400";
}

function resultBadge(tag: string): { label: string; className: string } {
  const u = tag.toUpperCase();
  if (u === "FIRST_DOWN") return { label: "1ST DOWN", className: "border-emerald-700 bg-emerald-900/50 text-emerald-300" };
  if (u === "TOUCHDOWN") return { label: "TD", className: "border-emerald-700 bg-emerald-900/50 text-emerald-300" };
  if (u === "GAIN") return { label: "GAIN", className: "border-blue-700 bg-blue-900/50 text-blue-300" };
  if (u === "NO_GAIN") return { label: "NO GAIN", className: "border-slate-600 bg-slate-700/50 text-slate-200" };
  if (u === "LOSS") return { label: "LOSS", className: "border-red-700 bg-red-900/50 text-red-300" };
  if (u === "INCOMPLETE") return { label: "INC", className: "border-slate-600 bg-slate-700/50 text-slate-200" };
  if (u === "TURNOVER") return { label: "INT", className: "border-red-700 bg-red-900/50 text-red-300" };
  if (u === "PUNT") return { label: "PUNT", className: "border-amber-700 bg-amber-900/50 text-amber-300" };
  if (u === "FIELD_GOAL") return { label: "FG", className: "border-emerald-700 bg-emerald-900/50 text-emerald-300" };
  return { label: tag.replace(/_/g, " "), className: "border-slate-600 bg-slate-700/50 text-slate-200" };
}

type PlayLogFeedRowProps = {
  play: LoggedPlay;
  driveFallback: number;
  showDriveRule: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function PlayLogFeedRow({ play, driveFallback, showDriveRule, onSelect, onDelete }: PlayLogFeedRowProps) {
  const dn = play.drive_number ?? driveFallback;
  const abs = toAbsoluteYard(play.side, play.yard_line);
  const pos = formatFieldPosition(abs);
  const y = play.yards_gained ?? 0;
  const badge = resultBadge(play.result_tag);
  const label = `${play.formation} → ${normalizePlayName(play.play_name)}`;

  return (
    <div
      className={`group/row flex min-h-11 items-stretch border-slate-800/80 ${showDriveRule ? "border-t border-amber-500/30" : ""}`}
    >
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-x-2 overflow-x-auto px-1 py-1 text-left font-mono text-xs sm:text-[13px]"
        onClick={onSelect}
      >
        <span className="shrink-0 font-medium text-amber-400">D{dn}</span>
        <span className="shrink-0 text-slate-400">
          {formatPlaySnapDnDist(play.down, play.distance, play.is_inches).replace("-", "&")}
        </span>
        <span className="shrink-0 text-slate-400">{pos}</span>
        <span className="min-w-0 flex-1 truncate text-slate-100">{label}</span>
        <span className={`shrink-0 font-medium tabular-nums ${yardsClass(y)}`}>{yardsDisplay(y)}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      </button>
      <button
        type="button"
        className="app-no-press-scale inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-500 opacity-70 hover:text-red-400 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
        aria-label="Delete play"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6h6z" />
        </svg>
      </button>
    </div>
  );
}
