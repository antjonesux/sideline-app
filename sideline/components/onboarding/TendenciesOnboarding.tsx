"use client";

import { OnboardingModal, type OnboardingStep } from "@/components/onboarding/OnboardingModal";
import { TendenciesOnboardingMockup } from "@/components/onboarding/mockups/TendenciesOnboardingMockup";
import {
  useFeatureOnboardingOpen,
  useMarkOnboardingSeen,
} from "@/hooks/useOnboardingState";
import { FEATURE_ONBOARDING_KEYS } from "@/lib/onboardingVersion";
import { useState } from "react";

const STEPS: OnboardingStep[] = [
  {
    heading: "STUDY YOUR PLAY CALLING",
    body: "See what's working, identify your habits before an opponent does, and make adjustments to improve your game.",
    visual: <TendenciesOnboardingMockup />,
  },
];

export function TendenciesOnboarding() {
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const enabled = !dismissedLocally;
  const { open } = useFeatureOnboardingOpen(FEATURE_ONBOARDING_KEYS.tendencies, enabled);
  const markSeen = useMarkOnboardingSeen();

  return (
    <OnboardingModal
      open={open}
      onClose={() => setDismissedLocally(true)}
      steps={STEPS}
      topBarLabel="Tendencies"
      closeLabel="Close onboarding modal"
      onComplete={() => {
        markSeen.mutate({ featureKey: FEATURE_ONBOARDING_KEYS.tendencies, seen: true });
      }}
    />
  );
}
