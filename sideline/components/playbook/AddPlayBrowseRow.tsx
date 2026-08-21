"use client";

import { PlayArtImage } from "@/components/playbook/PlayArtImage";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import type { PlaybookEntry } from "@/lib/playbook";
import { buildPlayArtUrl } from "@/lib/playArtUrl";
import { normalizePlayName } from "@/lib/utils";
import { Check } from "lucide-react";

export function AddPlayBrowseRow({
  play,
  formationLabel,
  showFormationLabel = false,
  inGoTo,
  goToBusy = false,
  showGoToStar = false,
  added = false,
  addDisabled = false,
  onAdd,
  onToggleGoTo,
  catalogSideOfBall,
  catalogGameVersion,
}: {
  play: PlaybookEntry;
  formationLabel: string;
  /** Search results span formations — show label to disambiguate. Hide inside a formation drill-in. */
  showFormationLabel?: boolean;
  inGoTo: boolean;
  goToBusy?: boolean;
  showGoToStar?: boolean;
  added?: boolean;
  addDisabled?: boolean;
  onAdd: (play: PlaybookEntry) => void;
  onToggleGoTo?: (play: PlaybookEntry) => void;
  catalogSideOfBall?: CatalogSideOfBall;
  catalogGameVersion?: CatalogGameVersion;
}) {
  const displayName = normalizePlayName(play.play_name);
  const artSrc =
    catalogSideOfBall && catalogGameVersion
      ? buildPlayArtUrl({
          formation: play.formation,
          formationType: play.group,
          playName: play.play_name,
          gameVersion: catalogGameVersion,
          side: catalogSideOfBall,
        })
      : null;

  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      {artSrc ? (
        <div className="px-3 pt-3">
          <PlayArtImage src={artSrc} alt="" />
        </div>
      ) : null}
      <div className="flex min-h-11 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold text-slate-100">{displayName}</p>
          {showFormationLabel ? (
            <p className="mt-0.5 truncate font-body text-xs text-slate-500">{formationLabel}</p>
          ) : null}
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
          {added ? (
            <span className="inline-flex min-h-11 min-w-11 items-center justify-center text-emerald-400" aria-hidden>
              <Check className="h-4 w-4" strokeWidth="2.5" />
            </span>
          ) : (
            <button
              type="button"
              disabled={addDisabled}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-slate-500 transition-colors hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500"
              onClick={() => onAdd(play)}
              aria-label={`Add ${displayName}`}
              title={`Add ${displayName}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
