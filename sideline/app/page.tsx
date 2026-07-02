import { HomeOnboardingGate } from "@/components/shared/HomeOnboardingGate";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/navigation/loginHref";
import { FORCE_ONBOARDING, ONBOARDING_ENABLED } from "@/lib/onboardingDismissed";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");
  if (!ONBOARDING_ENABLED && !FORCE_ONBOARDING) redirect(DEFAULT_POST_AUTH_PATH);

  return <HomeOnboardingGate />;
}
