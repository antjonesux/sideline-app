import type { FeatureOnboardingKey } from "@/lib/onboardingVersion";
import { isFeatureOnboardingKey } from "@/lib/onboardingVersion";

export type OnboardingSeenMap = Partial<Record<FeatureOnboardingKey, boolean>>;

export type OnboardingStateData = {
  welcomeModalVersionSeen: number | null;
  onboardingSeen: OnboardingSeenMap;
};

export const onboardingStateQueryKey = ["onboarding-state"] as const;

export function parseOnboardingSeen(raw: unknown): OnboardingSeenMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: OnboardingSeenMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isFeatureOnboardingKey(key)) continue;
    if (value === true) out[key] = true;
  }
  return out;
}

export function normalizeOnboardingState(row: {
  welcome_modal_version_seen?: number | null;
  onboarding_seen?: unknown;
} | null): OnboardingStateData {
  return {
    welcomeModalVersionSeen:
      typeof row?.welcome_modal_version_seen === "number" ? row.welcome_modal_version_seen : null,
    onboardingSeen: parseOnboardingSeen(row?.onboarding_seen),
  };
}
