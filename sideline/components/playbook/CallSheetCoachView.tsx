"use client";

import { PlayDetailOverlay } from "@/components/playbook/PlayDetailOverlay";
import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { usePlaySetupCounts } from "@/hooks/usePlaySetups";
import { getSituationColor } from "@/lib/constants";
import { CALL_SHEET_COACH_VIEW_EMPTY, PLAY_SETUP_COUNT_INDICATOR } from "@/lib/coachCopy";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioPlayCountLabel,
} from "@/lib/playbookUtils";
import { buildPlaySetupKey } from "@/lib/playSetupKey";
import type { PlayIdentity, SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { cn, normalizePlayName } from "@/lib/utils";
import { useMemo, useState } from "react";

function orderedScenarioBlocks(scenarios: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return [...scenarios].sort((a, b) => a.scenario_order - b.scenario_order);
}

function coachViewFormationGroups(plays: SheetPlayRow[]): { formation: string; plays: SheetPlayRow[] }[] {
  const sorted = [...plays].sort((a, b) => a.play_order - b.play_order);
  const byFormation = new Map<string, SheetPlayRow[]>();
  const formationOrder: string[] = [];

  for (const play of sorted) {
    const formation = play.formation;
    if (!byFormation.has(formation)) {
      byFormation.set(formation, []);
      formationOrder.push(formation);
    }
    byFormation.get(formation)!.push(play);
  }

  return formationOrder.map((formation) => ({
    formation,
    plays: byFormation.get(formation) ?? [],
  }));
}

function SetupNotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 4h8a2 2 0 0 1 2 2v12.5a.5.5 0 0 1-.8.4L14 16H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 11h4" />
    </svg>
  );
}

export function CallSheetCoachView({
  scenarios,
  gameVersion,
  sideOfBall,
  playbook,
  initiallyExpanded = false,
  enableSetupCounts = true,
  onOpenPlay,
}: {
  scenarios: SheetScenarioBlock[];
  gameVersion: string;
  sideOfBall: "offense" | "defense";
  playbook: string;
  /** When true, open every situation accordion on mount (QA / deep-link previews). */
  initiallyExpanded?: boolean;
  /** When false, skip `/api/play-setups/counts` (sessionless QA preview routes). */
  enableSetupCounts?: boolean;
  /**
   * When set, play taps are handed to the parent (e.g. desktop side rail).
   * Otherwise this view opens `PlayDetailOverlay` itself.
   */
  onOpenPlay?: (identity: PlayIdentity) => void;
}) {
  const orderedBlocks = useMemo(
    () => orderedScenarioBlocks(scenarios).filter((block) => block.plays.length > 0),
    [scenarios],
  );
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    initiallyExpanded
      ? new Set(scenarios.filter((block) => block.plays.length > 0).map((block) => block.id))
      : new Set(),
  );
  const [detailIdentity, setDetailIdentity] = useState<PlayIdentity | null>(null);

  const { data: setupCounts = {} } = usePlaySetupCounts(
    enableSetupCounts ? gameVersion : null,
    enableSetupCounts ? sideOfBall : null,
    enableSetupCounts ? playbook : null,
  );

  const totalPlays = useMemo(
    () => scenarios.reduce((acc, scenario) => acc + scenario.plays.length, 0),
    [scenarios],
  );

  if (totalPlays === 0) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center px-4 text-center">
        <p className="font-body text-sm text-slate-400">{CALL_SHEET_COACH_VIEW_EMPTY}</p>
      </div>
    );
  }

  function toggleSection(scenarioId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId);
      else next.add(scenarioId);
      return next;
    });
  }

  function openPlay(play: SheetPlayRow) {
    const identity: PlayIdentity = {
      game_version: gameVersion,
      side_of_ball: sideOfBall,
      playbook,
      formation: play.formation,
      play_name: play.play_name,
    };
    if (onOpenPlay) {
      onOpenPlay(identity);
      return;
    }
    setDetailIdentity(identity);
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {orderedBlocks.map((block) => {
          const isExpanded = expanded.has(block.id);
          const count = block.plays.length;
          const sectionLabel = callSheetScenarioDisplayName(block.scenario).toUpperCase();
          const colorKey = block.color ?? "blue";
          const colors = getSituationColor(colorKey);
          const sortedPlays = [...block.plays].sort((a, b) => a.play_order - b.play_order);
          const formationGroups = coachViewFormationGroups(sortedPlays);

          return (
            <section key={block.id} className="overflow-hidden rounded-xl">
              <button
                type="button"
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
                  colors.bg,
                  isExpanded ? "rounded-t-xl" : "rounded-xl",
                )}
                onClick={() => toggleSection(block.id)}
                aria-expanded={isExpanded}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <SituationIconBadge
                    icon={block.icon}
                    colorKey={colorKey}
                    name={block.scenario}
                    size="md"
                  />
                  <span
                    className={cn(
                      "min-w-0 truncate font-heading text-sm font-bold uppercase tracking-wide",
                      colors.text,
                    )}
                  >
                    {sectionLabel}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={cn("font-body text-xs opacity-80", colors.text)}>
                    {callSheetScenarioPlayCountLabel(count)}
                  </span>
                  <svg
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-80 transition-transform motion-reduce:transition-none",
                      colors.text,
                      isExpanded && "rotate-180",
                    )}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              {isExpanded ? (
                <div className="rounded-b-xl bg-slate-900 px-4 pb-2">
                  {formationGroups.map((group, groupIndex) => (
                    <div
                      key={`${group.formation}-${group.plays[0]?.id ?? groupIndex}`}
                      className={cn(
                        "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-x-4 border-b border-slate-700/50 py-3",
                        groupIndex === formationGroups.length - 1 && "border-b-0",
                      )}
                    >
                      <p className="flex min-h-11 min-w-0 items-center font-body text-sm leading-snug break-words text-slate-400 md:min-h-12">
                        {group.formation}
                      </p>
                      <div className="min-w-0 flex-1 space-y-1">
                        {group.plays.map((play) => {
                          const key = buildPlaySetupKey({
                            game_version: gameVersion,
                            side_of_ball: sideOfBall,
                            playbook,
                            formation: play.formation,
                            play_name: play.play_name,
                          });
                          const setupCount = setupCounts[key] ?? 0;
                          return (
                            <button
                              key={play.id}
                              type="button"
                              onClick={() => openPlay(play)}
                              className="flex min-h-11 w-full items-center gap-3 rounded-md py-1.5 pl-3 pr-1.5 text-start transition-colors hover:bg-slate-800/70 active:bg-slate-800 md:min-h-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                            >
                              <span className="min-w-0 flex-1 truncate font-body text-sm uppercase tracking-wide text-white">
                                {normalizePlayName(play.play_name)}
                              </span>
                              {setupCount > 0 ? (
                                <span
                                  className="inline-flex w-8 shrink-0 items-center justify-center gap-1 font-mono text-xs text-slate-400"
                                  title={PLAY_SETUP_COUNT_INDICATOR(setupCount)}
                                >
                                  <SetupNotesIcon className="h-5 w-5" />
                                  {setupCount}
                                </span>
                              ) : null}
                              <svg
                                className="h-4 w-4 shrink-0 text-slate-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                              >
                                <path d="m9 6 6 6-6 6" />
                              </svg>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {!onOpenPlay && detailIdentity ? (
        <PlayDetailOverlay
          open={Boolean(detailIdentity)}
          onClose={() => setDetailIdentity(null)}
          identity={detailIdentity}
        />
      ) : null}
    </>
  );
}
