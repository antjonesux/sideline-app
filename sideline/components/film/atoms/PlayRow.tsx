"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { PlaybookEntry, OffensiveCatalogPlayType } from "@/lib/playbook";
import type { LoggedPlay } from "@/lib/types";
import { ResultBadge } from "@/components/import/ResultBadge";
import {
  defensivePlayTypeAccentClass,
  defensivePlayTypeBadgeClass,
  isDefensivePlayType,
} from "@/lib/defensivePlayTypeResolution";
import { playResultDisplayLabel } from "@/lib/filmConversionResults";
import {
  FILM_LOGGER_SPECIAL_TEAMS_ACCENT_CLASS,
  FILM_LOGGER_SPECIAL_TEAMS_BADGE_CLASS,
  isFilmLoggerSpecialTeamsEntry,
} from "@/lib/filmLoggerSpecialTeams";

type PlaybookRowProps = {
  variant?: "playbook";
  play: PlaybookEntry;
  onSelect: (play: PlaybookEntry) => void;
};

export type PlayStreamRowProps = {
  variant: "stream";
  play: LoggedPlay;
  /** 0 = most recent, 1 = second, 2+ = older */
  streamIndex: number;
  isConfirmingDelete: boolean;
  onDeletePress: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export type PlayRowProps = PlaybookRowProps | PlayStreamRowProps;

const VALID_OFFENSIVE_PLAY_TYPES = ["RUN", "PASS", "RPO"] as const;
type OffensivePlayTypeBadge = OffensiveCatalogPlayType;

function getOffensivePlayType(raw: string | null | undefined): OffensivePlayTypeBadge {
  const u = (raw ?? "").trim().toUpperCase();
  if (VALID_OFFENSIVE_PLAY_TYPES.includes(u as OffensivePlayTypeBadge)) return u as OffensivePlayTypeBadge;
  if (process.env.NODE_ENV === "development") {
    console.warn(`[PlayRow] Unexpected offensive play_type: "${raw}" — check migration QA18`);
  }
  return "RUN";
}

function offensiveBadgeClass(type: OffensivePlayTypeBadge): string {
  if (type === "RUN") return "border-emerald-700/70 bg-emerald-900/30 text-emerald-300";
  if (type === "PASS") return "border-blue-700/70 bg-blue-900/30 text-blue-300";
  return "border-amber-700/70 bg-amber-900/30 text-amber-300";
}

function streamOpacityClass(streamIndex: number): string {
  if (streamIndex === 0) return "opacity-100";
  if (streamIndex === 1) return "opacity-60";
  return "opacity-30";
}

function resultBadgeLabel(play: LoggedPlay): string {
  return playResultDisplayLabel(play);
}

export function PlayRow(props: PlayRowProps) {
  if (props.variant === "stream") {
    const { play, streamIndex, isConfirmingDelete, onDeletePress, onConfirmDelete, onCancelDelete } = props;
    const opacity = streamOpacityClass(streamIndex);
    return (
      <div
        className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-slate-800 px-2 py-2 ${
          isConfirmingDelete ? "bg-red-900/20" : `bg-slate-900/80 ${opacity}`
        }`}
      >
        <span className="w-8 shrink-0 font-mono text-[10px] text-slate-500">#{play.play_number ?? "—"}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-400">
          {play.formation} · {play.play_name}
        </span>
        {play.result_tag ? (
          <span className="inline-flex max-w-[5.5rem] shrink-0 truncate">
            <ResultBadge label={resultBadgeLabel(play)} />
          </span>
        ) : null}
        <span className="shrink-0 font-mono text-xs text-slate-400">
          {play.yards_gained != null && play.yards_gained >= 0 ? "+" : ""}
          {play.yards_gained ?? 0}
        </span>
        <div className="flex shrink-0 items-center justify-end">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="min-h-11 rounded px-2 font-mono text-[11px] text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                onClick={onConfirmDelete}
              >
                Confirm
              </button>
              <button
                type="button"
                className="min-h-11 rounded px-2 font-mono text-[11px] text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                onClick={onCancelDelete}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Remove call"
              className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center text-xs text-slate-500 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePress();
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { play, onSelect } = props;
  const filmSt = isFilmLoggerSpecialTeamsEntry(play);
  const defensiveType = isDefensivePlayType(play.play_type) ? play.play_type : null;
  const offensiveType = defensiveType ? null : getOffensivePlayType(play.play_type);
  return (
    <button
      type="button"
      onClick={() => onSelect(play)}
      className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-left"
    >
      <span
        className={`h-8 w-[3px] shrink-0 rounded ${
          filmSt
            ? FILM_LOGGER_SPECIAL_TEAMS_ACCENT_CLASS
            : defensiveType
              ? defensivePlayTypeAccentClass(defensiveType)
              : offensiveType === "RUN"
                ? "bg-emerald-500"
                : offensiveType === "PASS"
                  ? "bg-blue-500"
                  : "bg-amber-500"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-[13px] font-semibold text-slate-100">{play.play_name}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-slate-500">{play.formation}</span>
      </span>
      {defensiveType ? (
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${defensivePlayTypeBadgeClass(defensiveType)}`}
        >
          {defensiveType}
        </span>
      ) : (
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${
            filmSt ? FILM_LOGGER_SPECIAL_TEAMS_BADGE_CLASS : offensiveBadgeClass(offensiveType!)
          }`}
        >
          {filmSt ? "Special Teams" : offensiveType}
        </span>
      )}
    </button>
  );
}
