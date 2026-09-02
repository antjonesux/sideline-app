"use client";

import { OnboardingModal, type OnboardingStep } from "@/components/onboarding/OnboardingModal";
import { FilmRoomOnboardingMockup } from "@/components/onboarding/mockups/FilmRoomOnboardingMockup";
import {
  useFeatureOnboardingOpen,
  useMarkOnboardingSeen,
} from "@/hooks/useOnboardingState";
import { FEATURE_ONBOARDING_KEYS } from "@/lib/onboardingVersion";
import { useState } from "react";

const STEPS: OnboardingStep[] = [
  {
    heading: "REVIEW EVERY GAME",
    body: "Log your calls, review your results, and see what worked. Film Room turns every game into a study session.",
    visual: <FilmRoomOnboardingMockup />,
  },
];

export function FilmRoomOnboarding() {
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const enabled = !dismissedLocally;
  const { open } = useFeatureOnboardingOpen(FEATURE_ONBOARDING_KEYS.filmRoom, enabled);
  const markSeen = useMarkOnboardingSeen();

  return (
    <OnboardingModal
      open={open}
      onClose={() => setDismissedLocally(true)}
      steps={STEPS}
      topBarLabel="Film Room"
      closeLabel="Close onboarding modal"
      onComplete={() => {
        markSeen.mutate({ featureKey: FEATURE_ONBOARDING_KEYS.filmRoom, seen: true });
      }}
    />
  );
}
