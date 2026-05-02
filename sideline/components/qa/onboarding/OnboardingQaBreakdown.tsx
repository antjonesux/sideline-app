"use client";

import { GuidedFirstDriveInsight } from "@/components/film/GuidedFirstDriveInsight";
import { onboardingQaFirstDriveReadout } from "@/lib/onboardingQaFixture";

export function OnboardingQaBreakdown() {
  return (
    <GuidedFirstDriveInsight
      open
      readout={onboardingQaFirstDriveReadout}
      onCallAnotherDrive={() => {}}
      onGoToFilmRoom={() => {}}
      anotherDriveBusy={false}
    />
  );
}
