"use client";

import { DEFAULT_POST_AUTH_PATH } from "@/lib/navigation/loginHref";
import { useAuth } from "@/components/providers/AuthProvider";
import { OnboardingCarousel } from "@/components/shared/OnboardingCarousel";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import {
  dismissOnboarding,
  FORCE_ONBOARDING,
  isOnboardingDismissed,
  ONBOARDING_ENABLED,
} from "@/lib/onboardingDismissed";
import { createClient } from "@/lib/supabase/client";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type GatePhase = "skeleton" | "redirecting" | "carousel";

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

export function HomeOnboardingGate() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const guidedDone = useLastGamePrefsStore((s) => s.guidedOnboardingDone);
  const guidedUserId = useLastGamePrefsStore((s) => s.guidedOnboardingUserId);
  const [prefsHydrated, setPrefsHydrated] = useState(() => useLastGamePrefsStore.persist.hasHydrated());
  const [phase, setPhase] = useState<GatePhase>("skeleton");

  useEffect(() => {
    if (useLastGamePrefsStore.persist.hasHydrated()) {
      setPrefsHydrated(true);
    }
    return useLastGamePrefsStore.persist.onFinishHydration(() => {
      setPrefsHydrated(true);
    });
  }, []);

  const uid = user?.id ?? null;
  const legacyOnboardingDismissed =
    Boolean(uid) && guidedDone && guidedUserId != null && guidedUserId === uid;

  const handleDismissOnboarding = useCallback(() => {
    if (uid) dismissOnboarding(uid);
    router.replace(DEFAULT_POST_AUTH_PATH);
  }, [router, uid]);

  const goToPlaybookCreate = useCallback(() => {
    router.replace("/playbook/new?onboarding=1");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (authLoading || !prefsHydrated) return;

      if (!uid) {
        router.replace("/landing");
        return;
      }

      if (!ONBOARDING_ENABLED && !FORCE_ONBOARDING) {
        setPhase("redirecting");
        router.replace(DEFAULT_POST_AUTH_PATH);
        return;
      }

      if (FORCE_ONBOARDING) {
        setPhase("carousel");
        return;
      }

      const supabase = createClient();

      const onboardingImport = GAME_SESSION_IMPORT_SOURCE_ONBOARDING;
      const [gamesResult, sheetsResult] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .or(`import_source.is.null,import_source.neq.${onboardingImport}`),
        supabase.from("play_sheets").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);

      if (cancelled) return;

      if (gamesResult.error || sheetsResult.error) {
        if (gamesResult.error) {
          console.error("[HomeOnboardingGate] game_sessions count:", gamesResult.error.message);
        }
        if (sheetsResult.error) {
          console.error("[HomeOnboardingGate] play_sheets count:", sheetsResult.error.message);
        }
        setPhase("redirecting");
        router.replace(DEFAULT_POST_AUTH_PATH);
        return;
      }

      const gameCount = gamesResult.count ?? 0;
      const sheetCount = sheetsResult.count ?? 0;
      const hasData = gameCount > 0 || sheetCount > 0;
      const dismissedFlag = isOnboardingDismissed(uid);
      const dismissed = dismissedFlag || legacyOnboardingDismissed;
      const shouldShowOnboarding = !hasData && !dismissed;

      if (!shouldShowOnboarding) {
        setPhase("redirecting");
        router.replace(DEFAULT_POST_AUTH_PATH);
        return;
      }

      setPhase("carousel");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, authLoading, prefsHydrated, uid, legacyOnboardingDismissed]);

  if (phase === "skeleton") {
    return <OnboardingSkeleton />;
  }

  if (phase === "redirecting") {
    return <OnboardingSkeleton subtitle="Loading Play Sheet…" />;
  }

  return (
    <section className="flex h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px)-env(safe-area-inset-top,0px))] min-h-0 w-full min-w-0 flex-col overflow-x-hidden py-0">
      <OnboardingCarousel onBuildPlan={goToPlaybookCreate} onDismiss={handleDismissOnboarding} />
    </section>
  );
}
