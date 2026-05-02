"use client";

import { YardageSheet } from "@/components/film/YardageSheet";
import { onboardingQaSnapGameState, onboardingQaYardagePlaybookEntry } from "@/lib/onboardingQaFixture";

export function OnboardingQaYardage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-slate-950">
      <YardageSheet
        play={onboardingQaYardagePlaybookEntry}
        currentGameState={onboardingQaSnapGameState}
        onboardingSpotHelper
        onLog={async () => {}}
        onCancel={() => {}}
      />
    </div>
  );
}
