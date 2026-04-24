import { PlaybookHome } from "@/components/playbook/PlaybookHome";

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string | string[]; onboarding?: string | string[]; cfb26?: string | string[] }>;
}) {
  const sp = await searchParams;
  const create = first(sp.create);
  const onboarding = first(sp.onboarding);
  const cfb26 = first(sp.cfb26);
  return (
    <PlaybookHome
      initialCreateOpen={create === "1"}
      onboardingFromHome={onboarding === "1"}
      initialCfb26FromOnboarding={cfb26?.trim() ? cfb26.trim() : undefined}
    />
  );
}
