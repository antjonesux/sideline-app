"use client";

import { useMemo } from "react";
import { DriveCardOutcomeBadge } from "@/components/film/DriveCardOutcomeBadge";
import { DriveInlineScores } from "@/components/film/DriveInlineScores";
import { DriveStartingFieldPanel } from "@/components/film/DriveStartingFieldPanel";
import {
  filmDriveDetailCardAccordionTriggerClass,
  filmDriveDetailCardChevronButtonClass,
  filmDriveDetailCardDriveLabelClass,
  filmDriveDetailCardExpandedPanelClass,
  filmDriveDetailCardHeaderRowClass,
  filmDriveDetailCardKebabTriggerClass,
  filmDriveDetailCardMetaLineClass,
  filmDriveDetailCardOuterClass,
  filmDriveDetailCardTitleRowClass,
} from "@/components/film/filmDriveDetailCardClasses";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns } from "@/components/shared/drivePlayTableColumns";
import { Button } from "@/components/ui/button";
import { getDriveResult, getDriveSummaryOutcomeLabel } from "@/lib/filmGameDetailHelpers";
import { absoluteYardAfterLoggedPlay } from "@/lib/gameStateEngine";
import type { Drive } from "@/lib/types";

type DriveListProps = {
  drives: Drive[];
  isGameEnded: boolean;
  lastDriveId: string;
  expandedDriveIds: string[];
  onExpandedDriveIdsChange: (updater: (current: string[]) => string[]) => void;
  onActiveDriveChange: (driveId: string) => void;
  onPatchDrive: (driveId: string, partial: Partial<Drive>) => void;
  onRequestDeleteDrive: (driveId: string) => void;
  onRequestDeletePlay: (playId: string) => void;
  onOpenLogger: (driveId: string) => void;
  onShowDriveSetup: () => void;
  showPartialWarning: boolean;
};

export function DriveList({
  drives,
  isGameEnded,
  lastDriveId,
  expandedDriveIds,
  onExpandedDriveIdsChange,
  onActiveDriveChange,
  onPatchDrive,
  onRequestDeleteDrive,
  onRequestDeletePlay,
  onOpenLogger,
  onShowDriveSetup,
  showPartialWarning,
}: DriveListProps) {
  const drivePlayCols = useMemo(() => drivePlayTableColumns(), []);

  return (
    <div className="space-y-4">
      {drives.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center font-sans text-sm text-slate-400">
          No drives yet.
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {drives.map((drive) => {
          const playCount = drive.plays?.length ?? 0;
          const outcomeLabel = getDriveSummaryOutcomeLabel(drive, { isLastDrive: drive.id === lastDriveId, isGameEnded });
          const isExpanded = expandedDriveIds.includes(drive.id);
          const mine = drive.score_mine ?? 0;
          const theirs = drive.score_opponent ?? 0;

          function toggleDriveExpanded() {
            onExpandedDriveIdsChange((current) => {
              const opening = !current.includes(drive.id);
              if (opening) {
                onActiveDriveChange(drive.id);
                return [drive.id];
              }
              return current.filter((id) => id !== drive.id);
            });
          }

          const quarterMeta =
            drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "Q1";
          const metaLine = `${quarterMeta} · ${mine}-${theirs} · ${playCount} ${playCount === 1 ? "call" : "calls"}`;

          return (
            <div key={drive.id} className={filmDriveDetailCardOuterClass}>
              <div className={filmDriveDetailCardHeaderRowClass}>
                <button
                  type="button"
                  data-no-press
                  className={filmDriveDetailCardAccordionTriggerClass}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                  onClick={toggleDriveExpanded}
                >
                  <div className={filmDriveDetailCardTitleRowClass}>
                    <span className={filmDriveDetailCardDriveLabelClass}>DRIVE {drive.drive_number}</span>
                    <span className="shrink-0">
                      <DriveCardOutcomeBadge label={outcomeLabel} />
                    </span>
                  </div>
                  <span className={filmDriveDetailCardMetaLineClass}>{metaLine}</span>
                </button>
                <DropdownMenu
                  aria-label="Drive actions"
                  clampMenuBelowSelector="[data-film-game-dropdown-clamp]"
                  triggerClassName={filmDriveDetailCardKebabTriggerClass}
                  items={[
                    {
                      label: "Delete Drive",
                      destructive: true,
                      onClick: () => onRequestDeleteDrive(drive.id),
                    },
                  ]}
                />
                <button
                  type="button"
                  data-no-press
                  className={filmDriveDetailCardChevronButtonClass}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                  onClick={toggleDriveExpanded}
                >
                  <svg
                    className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              {isExpanded ? (
                <div className={filmDriveDetailCardExpandedPanelClass}>
                  <div className="mb-3 flex flex-col gap-3">
                    <div>
                      <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        Quarter
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {([1, 2, 3, 4] as const).map((q) => {
                          const effQ = drive.quarter == null ? 1 : drive.quarter;
                          const selected = effQ === q && effQ < 5;
                          return (
                            <button
                              key={q}
                              type="button"
                              className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                                selected
                                  ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                                  : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                              }`}
                              onClick={() => onPatchDrive(drive.id, { quarter: q })}
                            >
                              {q}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                            drive.quarter != null && drive.quarter >= 5
                              ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                              : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                          }`}
                          onClick={() => onPatchDrive(drive.id, { quarter: 5 })}
                        >
                          OT
                        </button>
                      </div>
                    </div>
                    <DriveInlineScores
                      key={drive.id}
                      driveId={drive.id}
                      scoreMine={drive.score_mine}
                      scoreOpponent={drive.score_opponent}
                      onSaveBoth={(mineScore, oppScore) =>
                        onPatchDrive(drive.id, { score_mine: mineScore, score_opponent: oppScore })
                      }
                    />
                    <DriveStartingFieldPanel
                      drive={drive}
                      onPersist={(partial) => onPatchDrive(drive.id, partial)}
                    />
                  </div>
                  <DataTable
                    columns={drivePlayCols}
                    equalColumns
                    rows={(drive.plays ?? []).map((p) => ({
                      ...p,
                      ending_absolute_yard: absoluteYardAfterLoggedPlay(p, drive.drive_number),
                    }))}
                    getRowKey={(p) => p.id}
                    rowClassName="hover:bg-white/[0.02]"
                    onRowClick={undefined}
                    onRowContextMenu={(e, p) => {
                      e.preventDefault();
                      onRequestDeletePlay(p.id);
                    }}
                  />
                  <div className="border-t border-slate-800/80 py-3">
                    {(() => {
                      const driveOutcome = getDriveResult(drive.plays);
                      const canLog = !isGameEnded && (driveOutcome === "ACTIVE" || driveOutcome === "NO_PLAYS");
                      return canLog ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full border-dashed py-3 text-sm"
                          onClick={() => onOpenLogger(drive.id)}
                        >
                          Log a call
                        </Button>
                      ) : isGameEnded ? (
                        <p className="text-center font-sans text-xs text-slate-500">Game ended — resume to log calls</p>
                      ) : (
                        <p className="text-center font-sans text-xs text-slate-500">Drive ended</p>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {drives.length > 0 && !isGameEnded ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full border-dashed py-3 text-sm"
            onClick={onShowDriveSetup}
          >
            Add Drive
          </Button>
        ) : null}
      </div>

      {showPartialWarning ? (
        <div
          className="rounded-xl border border-slate-700 bg-slate-900 p-4 !border-amber-800/50 bg-amber-500/10 text-sm text-amber-100"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-amber-200">Partial film</p>
          <p className="mt-1 text-amber-100/90">Partial film may skew tendencies.</p>
        </div>
      ) : null}
    </div>
  );
}
