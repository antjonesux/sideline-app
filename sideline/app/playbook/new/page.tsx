import { CreatePlaybookModal } from "@/components/playbook/CreatePlaybookModal";

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function NewPlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string | string[]; cfb26?: string | string[] }>;
}) {
  const sp = await searchParams;
  const onboarding = first(sp.onboarding);
  const cfb26 = first(sp.cfb26)?.trim();

  if (onboarding === "1") {
    return (
      <CreatePlaybookModal
        variant="page"
        open
        guidedOnboardingFlow
        initialCfb26Playbook={cfb26 || undefined}
        onboardingFullPage
      />
    );
  }

  return <CreatePlaybookModal variant="page" open />;
}
