"use client";

import { CreatePlaybookModal } from "@/components/playbook/CreatePlaybookModal";
import {
  ONBOARDING_QA_CFB26_PLAYBOOK,
  onboardingQaStaticCfb26Playbooks,
} from "@/lib/onboardingQaFixture";

export function OnboardingQaNewPlaySheet() {
  return (
    <CreatePlaybookModal
      variant="page"
      open
      guidedOnboardingFlow
      onboardingFullPage
      initialCfb26Playbook={ONBOARDING_QA_CFB26_PLAYBOOK}
      qaStaticPlaybooks={onboardingQaStaticCfb26Playbooks}
    />
  );
}
