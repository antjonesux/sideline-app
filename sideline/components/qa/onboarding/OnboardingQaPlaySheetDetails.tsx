"use client";

import { PlaySlot } from "@/components/playbook/PlaySlot";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { Button } from "@/components/ui/button";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";
import {
  ONBOARDING_START_LOGS,
  ONBOARDING_DEFAULT_SHEET_NAME,
} from "@/lib/coachCopy";
import {
  ONBOARDING_QA_CFB26_PLAYBOOK,
  onboardingQaEditorScenario,
  onboardingQaSheetPlays,
} from "@/lib/onboardingQaFixture";
import { scenarioDisplayLabel } from "@/lib/playbookUtils";
import { useCallback, useState } from "react";

const MIN_ONBOARDING_SHEET_PLAYS = 3;

export function OnboardingQaPlaySheetDetails() {
  const [dragId, setDragId] = useState<string | null>(null);
  const noop = useCallback(() => {}, []);
  const totalPlays = onboardingQaSheetPlays.length;
  const playsStillNeeded = Math.max(0, MIN_ONBOARDING_SHEET_PLAYS - totalPlays);
  const canTakeField = totalPlays >= MIN_ONBOARDING_SHEET_PLAYS;

  const playSlotProps = {
    onAdd: noop,
    onRemove: () => Promise.resolve(),
    dragId,
    setDragId,
    onReorder: noop,
  } as const;

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))]">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{ONBOARDING_DEFAULT_SHEET_NAME}</h1>
          </div>
          <p className="font-body text-sm text-slate-400">Built from {ONBOARDING_QA_CFB26_PLAYBOOK} playbook</p>
        </div>

        <section className="min-w-0 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
            Calls for:{" "}
            <span className="text-white">{scenarioDisplayLabel(onboardingQaEditorScenario)}</span>
          </h2>

          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/90">
            <PlayTableHeader />
            <div>
              {onboardingQaSheetPlays.map((play, slotIndex) => (
                <PlaySlot
                  key={play.id}
                  play={play}
                  slotIndex={slotIndex}
                  {...playSlotProps}
                  atCapacity={false}
                />
              ))}
              <PlaySlot
                key="slot-add-next"
                play={null}
                slotIndex={onboardingQaSheetPlays.length}
                {...playSlotProps}
                atCapacity={false}
              />
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
        <p className="font-body text-sm font-medium text-slate-100">
          Add {MIN_ONBOARDING_SHEET_PLAYS} calls to take the field.
        </p>
        <p className="mt-0.5 font-body text-sm text-slate-400">
          {playsStillNeeded > 0 ? `${playsStillNeeded} more needed.` : "You're ready when you are."}
        </p>
        <Button type="button" variant="default" className="mt-3 w-full text-sm" disabled={!canTakeField}>
          {ONBOARDING_START_LOGS}
        </Button>
      </footer>
    </div>
  );
}
