"use client";

import { OnboardingModal, type OnboardingStep } from "@/components/onboarding/OnboardingModal";
import { WelcomeBrowsePlaybooksMockup } from "@/components/onboarding/mockups/WelcomeBrowsePlaybooksMockup";
import { WelcomeFilmRoomMockup } from "@/components/onboarding/mockups/FilmRoomOnboardingMockup";
import { WelcomeTendenciesMockup } from "@/components/onboarding/mockups/TendenciesOnboardingMockup";
import {
  markWelcomeCompletePayload,
  useMarkOnboardingSeen,
} from "@/hooks/useOnboardingState";

const WELCOME_STEPS: OnboardingStep[] = [
  {
    heading: "REVIEW EVERY GAME",
    body: "Log your calls, review your results, and see what worked. Film Room turns every game into a study session.",
    visual: <WelcomeFilmRoomMockup />,
  },
  {
    heading: "STUDY YOUR PLAY CALLING",
    body: "See what's working, identify your habits before an opponent does, and make adjustments to improve your game.",
    visual: <WelcomeTendenciesMockup />,
  },
  {
    heading: "EVERY PLAYBOOK. EVERY PLAY",
    body: "Browse every offensive and defensive playbook in College Football 27. Explore formations, view plays, and add them to your call sheet in one tap.",
    visual: <WelcomeBrowsePlaybooksMockup />,
  },
];

type WelcomeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  const markSeen = useMarkOnboardingSeen();

  return (
    <OnboardingModal
      open={open}
      onClose={() => onOpenChange(false)}
      steps={WELCOME_STEPS}
      topBarLabel="New Enhancements"
      closeLabel="Close welcome modal"
      onComplete={() => {
        markSeen.mutate(markWelcomeCompletePayload());
      }}
    />
  );
}
