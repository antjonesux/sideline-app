"use client";

import { PlayArtImage } from "@/components/playbook/PlayArtImage";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import type { PlaybookEntry } from "@/lib/playbook";
import { resolvePlayArtUrl } from "@/lib/playArtUrl";
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
  onSelect,
  catalogSideOfBall,
  catalogGameVersion,
  catalogPlaybook,
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
  onAdd?: (play: PlaybookEntry) => void;
  onToggleGoTo?: (play: PlaybookEntry) => void;
  /** Film logger browse — tap row to select; hides add / Go-To controls. */
  onSelect?: (play: PlaybookEntry) => void;
  catalogSideOfBall?: CatalogSideOfBall;
  catalogGameVersion?: CatalogGameVersion;
  /** Catalog playbook name for owned play-art resolution. */
  catalogPlaybook?: string;
}) {
  const displayName = normalizePlayName(play.play_name);
  const resolvedArt =
    catalogSideOfBall && catalogGameVersion && catalogPlaybook
      ? resolvePlayArtUrl({
          playbook: catalogPlaybook,
          formation: play.formation,
          formationType: play.group,
          playName: play.play_name,
          gameVersion: catalogGameVersion,
          side: catalogSideOfBall,
        })
      : null;

  const titleRow = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-slate-100">{displayName}</p>
        {showFormationLabel ? (
          <p className="mt-0.5 truncate font-body text-xs text-slate-500">{formationLabel}</p>
        ) : null}
      </div>
      {!onSelect && showGoToStar ? (
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
      {!onSelect ? (
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
              onClick={() => onAdd?.(play)}
              aria-label={`Add ${displayName}`}
              title={`Add ${displayName}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      ) : null}
    </>
  );

  const showArtSlot = Boolean(catalogSideOfBall && catalogGameVersion && catalogPlaybook);

  const artBlock = showArtSlot ? (
    <div className="px-3 pb-3">
      <PlayArtImage
        src={resolvedArt?.src ?? null}
        source={resolvedArt?.source}
        alt=""
      />
    </div>
  ) : null;

  if (onSelect) {
    return (
      <div className="border-b border-slate-700/50 last:border-b-0">
        <button
          type="button"
          className="flex w-full min-h-11 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          onClick={() => onSelect(play)}
        >
          <div className="flex min-h-11 w-full items-center gap-3 px-4 pt-3 pb-2">{titleRow}</div>
          {artBlock}
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      <div className="flex min-h-11 items-center gap-3 px-4 pt-3 pb-2">{titleRow}</div>
      {artBlock}
    </div>
  );
}
