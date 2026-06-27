"use client";

import { CallSheetBuilderSituationHeader } from "@/components/playbook/CallSheetBuilderSituationHeader";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { PlayTableRow } from "@/components/game-plan/PlayTableRow";
import { GO_TO_PLAYS_SCENARIO } from "@/lib/constants";
import {
  GO_TO_PLAYS_EMPTY_BODY,
  GO_TO_PLAYS_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { resolveCfbDisplayPlayType } from "@/lib/playbook";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioHelperText,
  callSheetScenarioPlayCountHeaderLabel,
  callSheetScenarioPlayCountLabel,
  isCallSheetScenario,
  maxSlotsForSheetScenario,
  sheetPlayComboKey,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { useMemo } from "react";

export function CallSheetViewerSituation({
  backHref,
  activeScenario,
  scenarios,
}: {
  backHref: string;
  activeScenario: string;
  scenarios: SheetScenarioBlock[];
}) {
  const activeBlock = scenarios.find((s) => s.scenario === activeScenario);
  const sortedPlays = useMemo(
    () => [...(activeBlock?.plays ?? [])].sort((a, b) => a.play_order - b.play_order),
    [activeBlock?.plays],
  );
  const goToBlock = scenarios.find((s) => s.scenario === GO_TO_PLAYS_SCENARIO);
  const goToPlayKeys = useMemo(
    () => new Set((goToBlock?.plays ?? []).map((p) => sheetPlayComboKey(p.formation, p.play_name))),
    [goToBlock?.plays],
  );

  const isGoToSituation = activeScenario === GO_TO_PLAYS_SCENARIO;
  const showGoToStar = Boolean(goToBlock?.id);
  const filled = sortedPlays.length;
  const maxSlots = maxSlotsForSheetScenario(activeScenario);

  const title = isCallSheetScenario(activeScenario)
    ? callSheetScenarioDisplayName(activeScenario)
    : activeScenario;
  const subtitle = callSheetScenarioHelperText(activeScenario);
  const playCountLabel = isGoToSituation
    ? callSheetScenarioPlayCountLabel(filled)
    : callSheetScenarioPlayCountHeaderLabel(filled, maxSlots);

  return (
    <div className="space-y-6">
      <CallSheetBuilderSituationHeader
        backHref={backHref}
        title={title}
        subtitle={subtitle}
        playCountLabel={playCountLabel}
      />

      <section className="min-w-0">
        {filled === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="font-body text-base font-medium text-white">
              {isGoToSituation ? GO_TO_PLAYS_EMPTY_HEADLINE : "No calls for this situation yet."}
            </p>
            {isGoToSituation ? (
              <p className="mt-1 font-body text-sm text-slate-400">{GO_TO_PLAYS_EMPTY_BODY}</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
            <PlayTableHeader
              showGoToColumn={showGoToStar}
              stackFormation
              hideRemoveColumn
              hideDragColumn
            />
            <div>
              {sortedPlays.map((play) => (
                <PlayTableRow
                  key={play.id}
                  play={play}
                  playType={resolveCfbDisplayPlayType(play.play_name, play.play_type ?? null)}
                  onRemove={() => {}}
                  readOnly
                  formationFirstLabel
                  showGoToStar={showGoToStar}
                  inGoTo={
                    isGoToSituation ||
                    goToPlayKeys.has(sheetPlayComboKey(play.formation, play.play_name))
                  }
                  stackFormation
                  hideRemove={isGoToSituation}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
