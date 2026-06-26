"use client";

import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";
import type { GamePlanPlayType } from "@/components/game-plan/PlayTableRow";
import type { PlaybookEntry } from "@/lib/playbook";
import { resolveCfbDisplayPlayType } from "@/lib/playbook";
import { normalizePlayName } from "@/lib/utils";

export function AddPlayBrowseRow({
  play,
  formationLabel,
  inGoTo,
  goToBusy = false,
  showGoToStar = false,
  onAdd,
  onToggleGoTo,
}: {
  play: PlaybookEntry;
  formationLabel: string;
  inGoTo: boolean;
  goToBusy?: boolean;
  showGoToStar?: boolean;
  onAdd: (play: PlaybookEntry) => void;
  onToggleGoTo?: (play: PlaybookEntry) => void;
}) {
  const playType = resolveCfbDisplayPlayType(play.play_name, play.play_type) as GamePlanPlayType;

  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-slate-700/50 px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-slate-100">{normalizePlayName(play.play_name)}</p>
        <p className="mt-0.5 truncate font-body text-xs text-slate-500">{formationLabel}</p>
      </div>
      <div className="flex w-16 shrink-0 justify-center">
        <PlayTypeBadge type={playType} />
      </div>
      {showGoToStar ? (
        <div className="flex w-8 shrink-0 justify-center">
          <button
            type="button"
            disabled={goToBusy}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors disabled:opacity-50 ${
              inGoTo ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-amber-300"
            }`}
            onClick={() => onToggleGoTo?.(play)}
            aria-label={inGoTo ? "Remove from Go-To" : "Add to Go-To"}
            aria-pressed={inGoTo}
            title={inGoTo ? "Remove from Go-To" : "Add to Go-To"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill={inGoTo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
            </svg>
          </button>
        </div>
      ) : null}
      <div className="flex w-8 shrink-0 justify-center">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-slate-500 transition-colors hover:text-emerald-400"
          onClick={() => onAdd(play)}
          aria-label={`Add ${normalizePlayName(play.play_name)}`}
          title={`Add ${normalizePlayName(play.play_name)}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
