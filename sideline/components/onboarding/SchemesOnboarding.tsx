"use client";

import { OnboardingModal, type OnboardingStep } from "@/components/onboarding/OnboardingModal";
import { SchemesOnboardingMockup } from "@/components/onboarding/mockups/SchemesOnboardingMockup";
import {
  useFeatureOnboardingOpen,
  useMarkOnboardingSeen,
} from "@/hooks/useOnboardingState";
import { FEATURE_ONBOARDING_KEYS } from "@/lib/onboardingVersion";
import { useState } from "react";

const STEPS: OnboardingStep[] = [
  {
    heading: "YOUR COACHING IDENTITY",
    body: "A scheme combines one offensive call sheet with one defensive call sheet to make your coaching identity.",
    visual: <SchemesOnboardingMockup />,
  },
];

export function SchemesOnboarding() {
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const enabled = !dismissedLocally;
  const { open } = useFeatureOnboardingOpen(FEATURE_ONBOARDING_KEYS.schemes, enabled);
  const markSeen = useMarkOnboardingSeen();

  return (
    <OnboardingModal
      open={open}
      onClose={() => setDismissedLocally(true)}
      steps={STEPS}
      topBarLabel="Schemes"
      closeLabel="Close onboarding modal"
      onComplete={() => {
        markSeen.mutate({ featureKey: FEATURE_ONBOARDING_KEYS.schemes, seen: true });
      }}
    />
  );
}
