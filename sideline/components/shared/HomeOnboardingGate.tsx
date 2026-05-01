"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { OnboardingCarousel } from "@/components/shared/OnboardingCarousel";
import { cn } from "@/lib/utils";
import { TeamCombobox } from "@/components/film/TeamCombobox";
import {
  COULDNT_LOAD,
  ONBOARDING_PLAYBOOK_CTA,
  ONBOARDING_PLAYBOOK_STEP_BODY,
  ONBOARDING_PLAYBOOK_STEP_TITLE,
} from "@/lib/coachCopy";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { dismissOnboarding, FORCE_ONBOARDING, isOnboardingDismissed } from "@/lib/onboardingDismissed";
import { createClient } from "@/lib/supabase/client";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type PlaybookOption = { team_name: string };

type GatePhase = "skeleton" | "redirecting" | "carousel" | "playbook";

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
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>(null);

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
    router.replace("/film");
  }, [router, uid]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (authLoading || !prefsHydrated) return;

      if (!uid) {
        router.replace("/landing");
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
        router.replace("/film");
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
        router.replace("/film");
        return;
      }

      setPhase("carousel");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, authLoading, prefsHydrated, uid, legacyOnboardingDismissed]);

  useEffect(() => {
    if (phase !== "playbook") return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/cfb26-playbooks");
      const j = (await res.json()) as { playbooks?: string[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setLoadErr(COULDNT_LOAD);
        setPlaybooks([]);
        return;
      }
      setLoadErr(null);
      setPlaybooks(j.playbooks ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const options = useMemo<PlaybookOption[]>(() => playbooks.map((p) => ({ team_name: p })), [playbooks]);

  if (phase === "skeleton") {
    return <OnboardingSkeleton />;
  }

  if (phase === "redirecting") {
    return <OnboardingSkeleton subtitle="Loading Film Room…" />;
  }

  if (phase === "carousel") {
    return (
      <section className="w-full min-w-0 py-2">
        <OnboardingCarousel onBuildPlan={() => setPhase("playbook")} onDismiss={handleDismissOnboarding} />
      </section>
    );
  }

  const playbookHref =
    selectedPlaybook != null
      ? `/playbook?create=1&onboarding=1&cfb26=${encodeURIComponent(selectedPlaybook.team_name)}`
      : "";

  return (
    <section className="space-y-8 py-4">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Step 2 of 2</p>
        <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">
          {ONBOARDING_PLAYBOOK_STEP_TITLE}
        </h1>
      </header>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-4">
        <p className="font-body text-sm leading-relaxed text-slate-300">{ONBOARDING_PLAYBOOK_STEP_BODY}</p>
        {loadErr ? (
          <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
            {loadErr}
          </p>
        ) : null}
        <TeamCombobox<PlaybookOption>
          label="Offensive playbook"
          inputId="onboarding-cfb26-playbook"
          selected={selectedPlaybook}
          onSelect={setSelectedPlaybook}
          options={options}
          loading={playbooks.length === 0 && !loadErr}
          placeholder="Search CFB26 playbooks"
          getOptionLabel={(o) => o.team_name}
          getOptionKey={(o) => o.team_name}
          getSearchText={(o) => o.team_name}
          showTrailingChevron={false}
        />
        <Button
          asChild
          variant="default"
          className={cn("inline-flex w-full justify-center text-sm", !selectedPlaybook && "pointer-events-none opacity-40")}
        >
          <Link href={playbookHref} aria-disabled={!selectedPlaybook}>
            {ONBOARDING_PLAYBOOK_CTA}
          </Link>
        </Button>
      </div>

      <Button type="button" variant="secondary" className="text-sm" onClick={() => setPhase("carousel")}>
        Back
      </Button>
    </section>
  );
}
