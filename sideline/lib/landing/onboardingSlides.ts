export type OnboardingSlide = {
  id: string;
  imageSrc: string;
  /** Intrinsic pixel size of `imageSrc` (used by next/image for correct aspect + layout). */
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  headline: string;
  supporting: string;
};

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "playsheet",
    imageSrc: "/onboarding/slide-1-playsheet.png",
    imageWidth: 996,
    imageHeight: 2010,
    imageAlt: "Play sheet with playbook scenarios and calls for first down",
    headline: "Build your game plan before kickoff",
    supporting:
      "Pick your best calls for every situation. When the game starts, you're not scrambling — you're coaching.",
  },
  {
    id: "logger",
    imageSrc: "/onboarding/slide-2-logger.png",
    imageWidth: 296,
    imageHeight: 232,
    imageAlt: "Play logger with drive strip and suggested calls",
    headline: "Call the game like a real coordinator",
    supporting:
      "Your game plan shows up the moment you need it. Pick your call, run it, see what works.",
  },
  {
    id: "breakdown",
    imageSrc: "/onboarding/slide-3-breakdown.png",
    imageWidth: 296,
    imageHeight: 232,
    imageAlt: "Tendencies breakdown with run-pass splits and situation table",
    headline: "Know exactly what you're calling",
    supporting:
      "Your run-pass splits, your go-to calls by situation, and where you're getting predictable — all in one place.",
  },
  {
    id: "tendencies",
    imageSrc: "/onboarding/slide-4-tendencies.png",
    imageWidth: 296,
    imageHeight: 232,
    imageAlt: "Tendencies page with What's Working and top plays",
    headline: "Your plan vs. your habits",
    supporting:
      "You have a game plan. Are you actually following it? See where you go off-script — and what you keep calling anyway.",
  },
] as const;

export const ONBOARDING_SLIDE_COUNT = ONBOARDING_SLIDES.length;
