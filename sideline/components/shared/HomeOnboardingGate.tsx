"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TeamCombobox } from "@/components/film/TeamCombobox";
import {
  COULDNT_LOAD,
  ONBOARDING_FILM_ROOM_BODY,
  ONBOARDING_FILM_ROOM_TITLE,
  ONBOARDING_GAME_DAY_BODY,
  ONBOARDING_GAME_DAY_TITLE,
  ONBOARDING_HOME_INTRO,
  ONBOARDING_HOME_TITLE,
  ONBOARDING_LOOP_BODY,
  ONBOARDING_LOOP_TITLE,
  ONBOARDING_PLAYBOOK_CTA,
  ONBOARDING_PLAYBOOK_STEP_BODY,
  ONBOARDING_PLAYBOOK_STEP_TITLE,
} from "@/lib/coachCopy";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PlaybookOption = { team_name: string };

const STEPS = [
  { title: ONBOARDING_HOME_TITLE, body: ONBOARDING_HOME_INTRO },
  { title: ONBOARDING_GAME_DAY_TITLE, body: ONBOARDING_GAME_DAY_BODY },
  { title: ONBOARDING_FILM_ROOM_TITLE, body: ONBOARDING_FILM_ROOM_BODY },
  { title: ONBOARDING_LOOP_TITLE, body: ONBOARDING_LOOP_BODY },
] as const;

type GameListRow = { play_count?: number | null };

/** Until the coach has logged at least one play, `/` always runs onboarding (each visit / login). */
type GatePhase = "loading" | "redirecting" | "onboarding";

export function HomeOnboardingGate() {
  const router = useRouter();
  const [phase, setPhase] = useState<GatePhase>("loading");
  const [step, setStep] = useState(0);
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/games");
      if (cancelled) return;
      if (res.status === 401) {
        router.replace("/landing");
        return;
      }
      const raw = (await res.json()) as unknown;
      const games = Array.isArray(raw) ? (raw as GameListRow[]) : [];
      const totalLogged = games.reduce((s, g) => s + (Number(g.play_count) || 0), 0);
      if (totalLogged > 0) {
        setPhase("redirecting");
        router.replace("/film");
        return;
      }
      setPhase("onboarding");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (phase !== "onboarding") return;
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

  if (phase === "loading" || phase === "redirecting") {
    return (
      <section className="space-y-4 py-8">
        <div className="animate-pulse rounded-md bg-slate-700/55 h-8 w-2/3 max-w-md rounded" />
        <div className="animate-pulse rounded-md bg-slate-700/55 h-24 w-full max-w-lg rounded-lg" />
        {phase === "redirecting" ? (
          <p className="font-body text-sm text-slate-400">Loading Film Room…</p>
        ) : null}
      </section>
    );
  }

  const isPlaybookStep = step === STEPS.length;
  const playbookHref =
    selectedPlaybook != null
      ? `/playbook?create=1&onboarding=1&cfb26=${encodeURIComponent(selectedPlaybook.team_name)}`
      : "";

  return (
    <section className="space-y-8 py-4">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          Step {Math.min(step + 1, STEPS.length + 1)} of {STEPS.length + 1}
        </p>
        <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">{isPlaybookStep ? ONBOARDING_PLAYBOOK_STEP_TITLE : STEPS[step]?.title}</h1>
      </header>

      {!isPlaybookStep ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
          <p className="font-body text-sm leading-relaxed text-slate-300">{STEPS[step]?.body}</p>
        </div>
      ) : (
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
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" className="text-sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
        ) : null}
        {!isPlaybookStep ? (
          <Button type="button" variant="default" className="text-sm" onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : null}
      </div>
    </section>
  );
}
