"use client";

import { AddPlayDrawer } from "@/components/playbook/AddPlayDrawer";
import { CallSheetBuilderSituationHeader } from "@/components/playbook/CallSheetBuilderSituationHeader";
import { CallSheetBuilderSituationWorkspace } from "@/components/playbook/CallSheetBuilderSituationWorkspace";
import { PlaySlot } from "@/components/playbook/PlaySlot";
import { PlaySuggestions } from "@/components/playbook/PlaySuggestions";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { Button } from "@/components/ui/button";
import type { SuggestionRow } from "@/lib/loggedPlayStats";
import type { PlaybookEntry } from "@/lib/playbook";
import {
  BUILDER_ADD_PLAY,
  BUILDER_BROWSE_PLAYBOOK,
  GO_TO_PLAYS_EMPTY_BODY,
  GO_TO_PLAYS_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { appShellSituationAddPlayButtonClass } from "@/lib/constants/designTokens";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioPlayCountHeaderLabel,
  maxSlotsForSheetScenario,
  sheetPlayComboKey,
} from "@/lib/playbookUtils";
import { GO_TO_PLAYS_SCENARIO } from "@/lib/constants";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

type DrawerUi = {
  open: boolean;
  scenarioName: string;
  catalogEntries: PlaybookEntry[];
  initialUi?: { step: "formations" | "plays"; formation?: { group: string; name: string } };
};

type Props = {
  sheetName: string;
  cfb26Playbook: string;
  scenarios: SheetScenarioBlock[];
  activeScenario: string;
  plays: SheetPlayRow[];
  suggestions?: SuggestionRow[];
  drawerUi?: DrawerUi | null;
};

export function PlaySheetQaSituationEditor({
  cfb26Playbook,
  scenarios,
  activeScenario,
  plays,
  suggestions = [],
  drawerUi = null,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const noop = useCallback(() => {}, []);
  const maxSlots = maxSlotsForSheetScenario(activeScenario);
  const filled = plays.length;
  const atCapacity = filled >= maxSlots;
  const isGoToSituation = activeScenario === GO_TO_PLAYS_SCENARIO;
  const goToPlays = scenarios.find((s) => s.scenario === GO_TO_PLAYS_SCENARIO)?.plays ?? [];
  const goToPlayKeys = new Set(goToPlays.map((p) => sheetPlayComboKey(p.formation, p.play_name)));
  const showGoToStar = Boolean(goToPlays.length || scenarios.some((s) => s.scenario === GO_TO_PLAYS_SCENARIO));
  const activeBlock = scenarios.find((s) => s.scenario === activeScenario);

  const playSlotProps = {
    onAdd: noop,
    onRemove: () => Promise.resolve(),
    dragId,
    setDragId,
    onReorder: noop,
    onToggleGoTo: noop,
    showGoToStar,
    stackFormation: true,
    hideRemove: isGoToSituation,
  } as const;

  const headerProps = {
    backHref: "/playbook",
    title: callSheetScenarioDisplayName(activeScenario),
    scenario: activeScenario,
    description: activeBlock?.description,
    colorKey: activeBlock?.color ?? "emerald",
    icon: activeBlock?.icon,
    playCountLabel: callSheetScenarioPlayCountHeaderLabel(filled, maxSlots),
    plays,
  };

  const renderPlays = (workspace = false) => (
    <>
      {filled === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <p className="font-body text-base font-medium text-white">
            {isGoToSituation ? GO_TO_PLAYS_EMPTY_HEADLINE : "No calls for this situation yet."}
          </p>
          <p className="mt-1 font-body text-sm text-slate-400">
            {isGoToSituation ? GO_TO_PLAYS_EMPTY_BODY : "Add calls to build your call sheet."}
          </p>
          {!isGoToSituation ? (
            <Button type="button" variant="default" className="mt-4 text-sm">
              {BUILDER_ADD_PLAY}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div
            className={cn(
              "overflow-hidden border border-slate-800 bg-slate-950/60",
              workspace ? "rounded-xl [&>div>div]:md:min-h-12" : "rounded-lg",
            )}
          >
            <PlayTableHeader showGoToColumn={showGoToStar} stackFormation hideRemoveColumn={isGoToSituation} />
            <div>
              {plays.map((play, slotIndex) => (
                <PlaySlot
                  key={play.id}
                  play={play}
                  slotIndex={slotIndex}
                  {...playSlotProps}
                  inGoTo={isGoToSituation || goToPlayKeys.has(sheetPlayComboKey(play.formation, play.play_name))}
                  atCapacity={atCapacity && !play}
                />
              ))}
              {!isGoToSituation && filled < maxSlots ? (
                <div className={workspace ? "md:hidden" : undefined}>
                  <PlaySlot
                    key="slot-add-next"
                    play={null}
                    slotIndex={filled}
                    {...playSlotProps}
                    atCapacity={atCapacity}
                  />
                </div>
              ) : null}
            </div>
          </div>
          {workspace && !isGoToSituation && filled < maxSlots ? (
            <button type="button" className={appShellSituationAddPlayButtonClass} disabled={atCapacity}>
              {BUILDER_ADD_PLAY}
            </button>
          ) : null}
        </>
      )}

      {!isGoToSituation && suggestions.length > 0 ? (
        <PlaySuggestions
          scenarioLabel={activeScenario}
          suggestions={suggestions}
          busyId={null}
          onAdd={noop}
          scenarioFull={atCapacity}
        />
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-6 md:hidden">
        <CallSheetBuilderSituationHeader {...headerProps} />
        {renderPlays(false)}
      </div>

      <CallSheetBuilderSituationWorkspace
        header={headerProps}
        browseActive={Boolean(drawerUi?.open)}
        onBrowsePlaybook={noop}
        browsePanel={
          drawerUi?.open
            ? {
                open: true,
                onClose: noop,
                cfb26Playbook,
                scenarioName: drawerUi.scenarioName,
                panelTitle: BUILDER_ADD_PLAY,
                panelSubtitle: `Adds to ${callSheetScenarioDisplayName(activeScenario)}`,
                onPick: noop,
                showGoToStar,
                goToPlayKeys,
                qaStaticEntries: drawerUi.catalogEntries,
                qaInitialUi: drawerUi.initialUi,
              }
            : null
        }
      >
        {renderPlays(true)}
      </CallSheetBuilderSituationWorkspace>

      {drawerUi?.open ? (
        <div className="md:hidden">
          <AddPlayDrawer
            open
            onClose={noop}
            cfb26Playbook={cfb26Playbook}
            scenarioName={drawerUi.scenarioName}
            onPick={noop}
            showGoToStar={showGoToStar}
            goToPlayKeys={goToPlayKeys}
            qaStaticEntries={drawerUi.catalogEntries}
            qaInitialUi={drawerUi.initialUi}
          />
        </div>
      ) : null}
    </div>
  );
}
