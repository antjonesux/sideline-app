"use client";

import { DEFAULT_POST_AUTH_PATH } from "@/lib/navigation/loginHref";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function OnboardingSkeleton({ subtitle }: { subtitle?: string }) {
  return (
    <section className="space-y-4 py-8">
      <div className="animate-pulse rounded-md bg-slate-700/55 h-8 w-2/3 max-w-md" />
      <div className="animate-pulse rounded-md bg-slate-700/55 h-48 w-full max-w-lg rounded-xl border border-slate-800/80" />
      <div className="animate-pulse rounded-md bg-slate-700/55 h-10 w-full max-w-lg rounded-xl" />
      {subtitle ? <p className="font-body text-sm text-slate-400">{subtitle}</p> : null}
    </section>
  );
}

/** Guided / carousel onboarding was removed; gate now only forwards to the post-auth home. */
export function HomeOnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEFAULT_POST_AUTH_PATH);
  }, [router]);

  return <OnboardingSkeleton subtitle="Loading Play Sheet…" />;
}
