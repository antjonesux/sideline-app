"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { modalCtaFooterClass } from "@/lib/constants/designTokens";
import { COULDNT_LOAD, COULDNT_SAVE, ONBOARDING_DEFAULT_SHEET_NAME, ONBOARDING_PLAYBOOK_CTA } from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";

type PlaybookOption = { team_name: string };

type Props = {
  /** When true, render as a full page (no dim backdrop framing). */
  variant?: "page" | "modal";
  open?: boolean;
  onClose?: () => void;
  /** When set and present in CFB26 list, pre-select this playbook (home onboarding). */
  initialCfb26Playbook?: string;
  /** After create, open editor with `?onboarding=1` for the guided sheet step. */
  guidedOnboardingFlow?: boolean;
  /** Guided home onboarding: single full-page step, no Cancel / breadcrumb escapes. */
  onboardingFullPage?: boolean;
  /** Local QA only: skip `/api/cfb26-playbooks` and use this list (e.g. `/qa/onboarding/*`). */
  qaStaticPlaybooks?: string[];
};

export function CreatePlaybookModal({
  variant = "page",
  open = true,
  onClose,
  initialCfb26Playbook,
  guidedOnboardingFlow = false,
  onboardingFullPage = false,
  qaStaticPlaybooks,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>(null);
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (variant === "modal" && open) {
      setStep(1);
      setName(guidedOnboardingFlow ? ONBOARDING_DEFAULT_SHEET_NAME : "");
      if (!initialCfb26Playbook?.trim()) setSelectedPlaybook(null);
    }
  }, [variant, open, initialCfb26Playbook, guidedOnboardingFlow]);

  useEffect(() => {
    if (!guidedOnboardingFlow) return;
    setName(ONBOARDING_DEFAULT_SHEET_NAME);
    setStep(1);
  }, [guidedOnboardingFlow]);

  useEffect(() => {
    if (!open || !initialCfb26Playbook?.trim()) return;
    const want = initialCfb26Playbook.trim().toLowerCase();
    const match = playbooks.find((p) => p.trim().toLowerCase() === want);
    if (match) setSelectedPlaybook({ team_name: match });
  }, [open, initialCfb26Playbook, playbooks]);

  useEffect(() => {
    if (qaStaticPlaybooks?.length) {
      setPlaybooks([...qaStaticPlaybooks].sort((a, b) => a.localeCompare(b)));
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadErr(null);
      const res = await fetch("/api/cfb26-playbooks");
      const j = (await res.json()) as { playbooks?: string[]; error?: string };
      if (!res.ok) {
        if (!cancelled) setLoadErr(COULDNT_LOAD);
        return;
      }
      if (!cancelled) setPlaybooks(j.playbooks ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [qaStaticPlaybooks]);

  const options = useMemo<PlaybookOption[]>(() => playbooks.map((p) => ({ team_name: p })), [playbooks]);

  const canStep1 =
    (guidedOnboardingFlow ? ONBOARDING_DEFAULT_SHEET_NAME.trim().length > 0 : name.trim().length > 0) &&
    Boolean(selectedPlaybook);

  async function createSheetAndNavigate() {
    setBusy(true);
    try {
      const sheetName = guidedOnboardingFlow ? ONBOARDING_DEFAULT_SHEET_NAME : name.trim();
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sheetName, cfb26_playbook: selectedPlaybook!.team_name }),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      if (j.id) {
        addToast("Play sheet created", "success");
        if (variant === "modal") onClose?.();
        if (guidedOnboardingFlow) router.push(`/playbook/${j.id}?onboarding=1`);
        else router.push(`/playbook/${j.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!canStep1) return;
      if (guidedOnboardingFlow) {
        await createSheetAndNavigate();
        return;
      }
      setStep(2);
      return;
    }

    await createSheetAndNavigate();
  }

  const inner = (
    <div
      className={`mx-auto flex flex-col ${
        variant === "page"
          ? "w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
          : "h-full min-h-0 w-full flex-1 overflow-hidden rounded-none border-0 bg-slate-900 shadow-none sm:h-auto sm:max-h-[inherit] sm:overflow-visible"
      }`}
    >
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            {variant === "modal" ? (
              <DialogTitle
                ref={dialogTitleRef}
                asChild
              >
                <h2
                  tabIndex={-1}
                  className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                >
                  New play sheet
                </h2>
              </DialogTitle>
            ) : (
              <h2 className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100">New play sheet</h2>
            )}
            {variant === "modal" ? (
              <DialogDescription asChild>
                <p className="mt-1 font-body text-sm text-slate-400">
                  {guidedOnboardingFlow
                    ? "We start your sheet as “My First Game Plan.” Pick your CFB26 book."
                    : step === 1
                      ? "Step 1 of 2 — play sheet name and CFB26 playbook"
                      : "Step 2 of 2 — start building"}
                </p>
              </DialogDescription>
            ) : (
              <p className="mt-1 font-body text-sm text-slate-400">
                {guidedOnboardingFlow
                  ? "We start your sheet as “My First Game Plan.” Pick your CFB26 book."
                  : step === 1
                    ? "Step 1 of 2 — play sheet name and CFB26 playbook"
                    : "Step 2 of 2 — start building"}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {loadErr ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
              {loadErr}
            </p>
          ) : null}

          {step === 1 ? (
            <>
              {guidedOnboardingFlow ? (
                <p className="rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2.5 font-body text-sm text-slate-200">
                  <span className="font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play sheet name</span>
                  <span className="mt-1 block font-medium text-white">{ONBOARDING_DEFAULT_SHEET_NAME}</span>
                </p>
              ) : (
                <label className="block space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play sheet name</span>
                  <input
                    className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                    placeholder="e.g. My Base Sheet, vs 3-3-5, Run Heavy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                  />
                </label>
              )}

              <TeamCombobox<PlaybookOption>
                label="Select CFB26 Playbook"
                inputId="create-cfb26-playbook"
                selected={selectedPlaybook}
                onSelect={setSelectedPlaybook}
                options={options}
                loading={playbooks.length === 0 && !loadErr}
                placeholder="Search CFB26 playbooks"
                getOptionLabel={(o) => o.team_name}
                getOptionKey={(o) => o.team_name}
                getSearchText={(o) => o.team_name}
                showTrailingChevron={false}
                openOnFocus={false}
              />
              <p className="font-body text-xs text-slate-500">This controls which formations and plays appear in the picker.</p>
            </>
          ) : (
            <div className="space-y-3 font-body text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Name:</span> {name.trim()}
              </p>
              <p>
                <span className="text-slate-500">CFB26 Playbook:</span> {selectedPlaybook?.team_name}
              </p>
              <p className="text-slate-500">We will create 15 empty situation slots on your play sheet. You can add calls in the editor.</p>
            </div>
          )}
        </div>

        <div className={modalCtaFooterClass}>
          {onboardingFullPage ? null : step === 2 ? (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : variant === "modal" ? (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onClose?.()}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push("/playbook")}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="default"
            className={onboardingFullPage ? "w-full flex-1" : "flex-1"}
            disabled={busy || (step === 1 && !canStep1)}
          >
            {guidedOnboardingFlow
              ? busy
                ? "Creating…"
                : ONBOARDING_PLAYBOOK_CTA
              : step === 1
                ? "Continue"
                : busy
                  ? "Creating…"
                  : "Create play sheet & open"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (variant === "page") {
    if (onboardingFullPage) {
      return (
        <section className="flex min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom,0px))] flex-col py-2">
          {inner}
        </section>
      );
    }
    return (
      <section className="space-y-6">
        <Breadcrumb segments={[{ label: "Playbook", href: "/playbook" }, { label: "New" }]} />
        <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">New Play Sheet</h1>
        {inner}
      </section>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && guidedOnboardingFlow) return;
        if (!next) onClose?.();
      }}
    >
      <DialogContent
        className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[90vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-xl rounded-b-none border-slate-700 bg-slate-900 p-0 text-slate-100 sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg [&>button]:text-slate-400 [&>button]:hover:text-white"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          dialogTitleRef.current?.focus({ preventScroll: true });
        }}
      >
        {inner}
      </DialogContent>
    </Dialog>
  );
}
