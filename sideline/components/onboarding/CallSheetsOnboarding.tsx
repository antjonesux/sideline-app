"use client";

import { OnboardingModal, type OnboardingStep } from "@/components/onboarding/OnboardingModal";
import { CallSheetsOnboardingMockup } from "@/components/onboarding/mockups/CallSheetsOnboardingMockup";
import {
  useFeatureOnboardingOpen,
  useMarkOnboardingSeen,
} from "@/hooks/useOnboardingState";
import { FEATURE_ONBOARDING_KEYS } from "@/lib/onboardingVersion";
import { useState } from "react";

const STEPS: OnboardingStep[] = [
  {
    heading: "BUILD YOUR CALL SHEET",
    body: "Organize the plays you run into game situations. Your call sheet becomes your game plan.",
    visual: <CallSheetsOnboardingMockup />,
  },
];

export function CallSheetsOnboarding() {
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const enabled = !dismissedLocally;
  const { open } = useFeatureOnboardingOpen(FEATURE_ONBOARDING_KEYS.callSheets, enabled);
  const markSeen = useMarkOnboardingSeen();

  return (
    <OnboardingModal
      open={open}
      onClose={() => setDismissedLocally(true)}
      steps={STEPS}
      topBarLabel="Call Sheets"
      closeLabel="Close onboarding modal"
      onComplete={() => {
        markSeen.mutate({ featureKey: FEATURE_ONBOARDING_KEYS.callSheets, seen: true });
      }}
    />
  );
}
