"use client";

import { PlayRow } from "@/components/film/atoms/PlayRow";
import { PlaySheetSituationChipScroll } from "@/components/shared/PlaySheetSituationChipScroll";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GUIDED_LOGGER_HEADER_SUBLINE,
  GUIDED_LOGGER_TITLE,
} from "@/lib/coachCopy";
import { formatFieldPosition } from "@/lib/fieldPosition";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import {
  onboardingQaEditorScenario,
  onboardingQaLoggerRemainingCalls,
  onboardingQaLoggerSheetScenarios,
  onboardingQaLoggerStreamPlays,
  onboardingQaMySheetRows,
  onboardingQaSnapGameState,
  onboardingQaSheetName,
} from "@/lib/onboardingQaFixture";

/** Matches active logger tab triggers in `app/film/[gameId]/page.tsx`. */
const filmLoggerPickTabTriggerClass =
  "flex min-h-12 w-full items-center justify-center rounded-none border-b-2 border-transparent bg-transparent px-2 text-center text-sm font-sans font-medium text-slate-400 shadow-none ring-offset-transparent transition-colors data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-100 data-[state=active]:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

const drive = { drive_number: 1 };

export function OnboardingQaLogger() {
  const st = onboardingQaSnapGameState;
  const situationLine = formatDownDistanceLabel(st.down, st.distance, {
    isGoalToGo: false,
    yardLine: st.absoluteYard,
    isInches: st.isInches,
  });
  const fieldLine = formatFieldPosition(st.absoluteYard);
  const mergedPlays = onboardingQaLoggerStreamPlays;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4">
      <div
        className="flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-none border border-slate-700 bg-slate-900 sm:h-auto sm:max-h-[85vh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">{GUIDED_LOGGER_TITLE}</h2>
            <p className="font-body text-sm leading-snug text-slate-400">
              {GUIDED_LOGGER_HEADER_SUBLINE(onboardingQaLoggerRemainingCalls)}
            </p>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col bg-slate-950">
          <div className="sticky top-0 w-full border-b border-slate-700 bg-slate-900">
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <span className="whitespace-nowrap font-mono text-[13px] font-semibold uppercase tracking-widest text-amber-400">
                DRIVE {drive.drive_number}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="font-mono text-[13px] font-semibold text-white">{situationLine}</span>
                <span className="font-mono text-xs text-slate-400">· {fieldLine}</span>
              </div>
              <span className="shrink-0 font-mono text-xs font-medium uppercase tracking-widest text-slate-400">
                {mergedPlays.length} {mergedPlays.length === 1 ? "CALL" : "CALLS"}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-900">
            <Tabs value="my_sheet" className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
              <TabsList
                aria-label="Play pick views"
                className="grid h-auto w-full shrink-0 grid-cols-3 gap-0 rounded-none border-b border-slate-800 bg-transparent p-0 text-muted-foreground"
              >
                <TabsTrigger value="browse" className={filmLoggerPickTabTriggerClass}>
                  Browse
                </TabsTrigger>
                <TabsTrigger value="situational" className={filmLoggerPickTabTriggerClass}>
                  Situational
                </TabsTrigger>
                <TabsTrigger value="my_sheet" className={filmLoggerPickTabTriggerClass}>
                  My Sheet
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="browse"
                className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
              >
                <div className="p-4 font-sans text-sm text-slate-500">QA preview — use My Sheet tab.</div>
              </TabsContent>
              <TabsContent
                value="situational"
                className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
              >
                <div className="p-4 font-sans text-sm text-slate-500">QA preview — use My Sheet tab.</div>
              </TabsContent>

              <TabsContent
                value="my_sheet"
                className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none data-[state=inactive]:hidden"
              >
                <div className="flex min-h-0 flex-1 flex-col pb-4">
                  <div className="shrink-0">
                    <PlaySheetSituationChipScroll
                      scenarios={onboardingQaLoggerSheetScenarios}
                      selectedScenario={onboardingQaEditorScenario}
                      onSelect={() => {}}
                      tabSemantics
                    />
                  </div>
                  <div className="px-4 pb-4">
                    <p className="mb-2 font-sans text-xs text-slate-400">Based on {onboardingQaSheetName} play sheet</p>
                    <div className="flex flex-col gap-2">
                      {onboardingQaMySheetRows.map((play) => (
                        <PlayRow key={play.play_id} variant="playbook" play={play} onSelect={() => {}} />
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
