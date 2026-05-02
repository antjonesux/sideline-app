"use client";

import { OnboardingCarousel } from "@/components/shared/OnboardingCarousel";

export function OnboardingQaCarousel() {
  return (
    <section className="flex h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px)-env(safe-area-inset-top,0px))] min-h-0 w-full min-w-0 flex-col overflow-x-hidden py-0">
      <OnboardingCarousel
        disableAutoAdvance
        onBuildPlan={() => {}}
        onDismiss={() => {}}
      />
    </section>
  );
}
