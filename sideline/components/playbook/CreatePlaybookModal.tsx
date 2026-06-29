"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { BackNavLink } from "@/components/shared/BackNavLink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { modalCtaFooterClass, modalDialogTitleClass } from "@/lib/constants/designTokens";
import {
  CATALOG_GAME_VERSION_LABELS,
  CATALOG_GAME_VERSIONS,
  DEFAULT_CATALOG_GAME_VERSION,
  type CatalogGameVersion,
} from "@/lib/constants";
import {
  COULDNT_LOAD,
  COULDNT_SAVE,
  ONBOARDING_DEFAULT_SHEET_NAME,
  PLAYBOOK_CREATE_CTA,
  PLAYBOOK_CREATE_NO_PLAYBOOKS_BODY,
  PLAYBOOK_CREATE_NO_PLAYBOOKS_HEADLINE,
  PLAYBOOK_CREATE_PLAYBOOK_SEARCH_PLACEHOLDER,
  PLAYBOOK_NEW_SHEET_NAME_PLACEHOLDER,
  PLAYBOOK_NEW_SHEET_SUBTITLE,
  PLAYBOOK_NEW_SHEET_TITLE,
} from "@/lib/coachCopy";
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
  /** Local QA only: pre-fill create form fields for screenshot capture. */
  qaPrefill?: { name?: string; playbook?: string };
};

export function CreatePlaybookModal({
  variant = "page",
  open = true,
  onClose,
  initialCfb26Playbook,
  guidedOnboardingFlow = false,
  onboardingFullPage = false,
  qaStaticPlaybooks,
  qaPrefill,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedGameVersion, setSelectedGameVersion] = useState<CatalogGameVersion>(() =>
    initialCfb26Playbook?.trim() ? "cfb26" : DEFAULT_CATALOG_GAME_VERSION,
  );
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>(null);
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (variant === "modal" && open) {
      setName(guidedOnboardingFlow ? ONBOARDING_DEFAULT_SHEET_NAME : "");
      if (!initialCfb26Playbook?.trim()) setSelectedPlaybook(null);
    }
  }, [variant, open, initialCfb26Playbook, guidedOnboardingFlow]);

  useEffect(() => {
    if (!guidedOnboardingFlow) return;
    setName(ONBOARDING_DEFAULT_SHEET_NAME);
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
      setPlaybooksLoading(false);
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    setPlaybooksLoading(true);
    setPlaybooks([]);
    setLoadErr(null);
    void (async () => {
      const res = await fetch(
        `/api/cfb26-playbooks?game_version=${encodeURIComponent(selectedGameVersion)}`,
      );
      const j = (await res.json()) as { playbooks?: string[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setLoadErr(COULDNT_LOAD);
        setPlaybooks([]);
        setPlaybooksLoading(false);
        return;
      }
      setPlaybooks(j.playbooks ?? []);
      setPlaybooksLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [qaStaticPlaybooks, selectedGameVersion]);

  useEffect(() => {
    if (qaStaticPlaybooks?.length || qaPrefill?.playbook?.trim()) return;
    if (initialCfb26Playbook?.trim() && selectedGameVersion === "cfb26") return;
    setSelectedPlaybook(null);
  }, [selectedGameVersion, qaStaticPlaybooks, qaPrefill?.playbook, initialCfb26Playbook]);

  useEffect(() => {
    if (!qaPrefill) return;
    if (qaPrefill.name?.trim()) setName(qaPrefill.name.trim());
    if (qaPrefill.playbook?.trim()) setSelectedPlaybook({ team_name: qaPrefill.playbook.trim() });
  }, [qaPrefill]);

  const options = useMemo<PlaybookOption[]>(() => playbooks.map((p) => ({ team_name: p })), [playbooks]);
  const catalogEmpty = !playbooksLoading && !loadErr && playbooks.length === 0;

  const canSubmit =
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
    if (!canSubmit) return;
    await createSheetAndNavigate();
  }

  const stepDescription = guidedOnboardingFlow
    ? "We start your sheet as “My First Play Sheet.” Pick your playbook."
    : PLAYBOOK_NEW_SHEET_SUBTITLE;

  const formFields = (
    <>
      {loadErr ? (
        <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
          {loadErr}
        </p>
      ) : null}

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
              placeholder={PLAYBOOK_NEW_SHEET_NAME_PLACEHOLDER}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Select Game</span>
          <Select
            value={selectedGameVersion}
            onValueChange={(value) => {
              setSelectedGameVersion(value as CatalogGameVersion);
            }}
          >
            <SelectTrigger className="hs-input h-auto w-full rounded-lg border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:ring-emerald-500/25">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
              {CATALOG_GAME_VERSIONS.map((version) => (
                <SelectItem
                  key={version}
                  value={version}
                  className="font-body text-sm text-slate-100 focus:bg-slate-800 focus:text-white"
                >
                  {CATALOG_GAME_VERSION_LABELS[version]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="block space-y-1">
          <TeamCombobox<PlaybookOption>
            label="Select Playbook"
            inputId="create-cfb26-playbook"
            selected={selectedPlaybook}
            onSelect={setSelectedPlaybook}
            options={options}
            loading={playbooksLoading}
            disabled={catalogEmpty}
            placeholder={PLAYBOOK_CREATE_PLAYBOOK_SEARCH_PLACEHOLDER}
            emptyOptionsMessage={PLAYBOOK_CREATE_NO_PLAYBOOKS_HEADLINE}
            getOptionLabel={(o) => o.team_name}
            getOptionKey={(o) => o.team_name}
            getSearchText={(o) => o.team_name}
            showTrailingChevron={false}
            openOnFocus={false}
          />
          {catalogEmpty ? (
            <div
              className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-center"
              role="status"
            >
              <p className="font-body text-sm font-medium text-white">{PLAYBOOK_CREATE_NO_PLAYBOOKS_HEADLINE}</p>
              <p className="mt-1 font-body text-xs text-slate-500">{PLAYBOOK_CREATE_NO_PLAYBOOKS_BODY}</p>
            </div>
          ) : null}
        </div>
      </>
    </>
  );

  const formFooter = (
    <div className="flex flex-col gap-3 sm:flex-row">
      {onboardingFullPage ? null : variant === "modal" ? (
        <Button type="button" variant="secondary" className="min-h-11 flex-1 sm:flex-1" onClick={() => onClose?.()}>
          Cancel
        </Button>
      ) : null}
      <Button
        type="submit"
        variant="default"
        className={`min-h-11 py-3 text-sm ${
          onboardingFullPage || variant === "page" ? "w-full" : "flex-1 sm:flex-1"
        }`}
        disabled={busy || !canSubmit}
      >
        {busy ? "Creating…" : PLAYBOOK_CREATE_CTA}
      </Button>
    </div>
  );

  const modalInner = (
    <div
      className={
        "mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden rounded-none border-0 bg-slate-900 shadow-none sm:h-auto sm:max-h-[inherit] sm:overflow-visible"
      }
    >
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle ref={dialogTitleRef} asChild>
              <h2
                tabIndex={-1}
                className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              >
                {PLAYBOOK_NEW_SHEET_TITLE}
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="mt-1 font-body text-sm text-slate-400">{stepDescription}</p>
            </DialogDescription>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">{formFields}</div>

        <div className={modalCtaFooterClass}>{formFooter}</div>
      </form>
    </div>
  );

  const pageForm = (
    <form onSubmit={onSubmit} className="space-y-6">
      <header className="space-y-2">
        <h1 className={modalDialogTitleClass}>{PLAYBOOK_NEW_SHEET_TITLE}</h1>
        <p className="font-body text-sm text-slate-400">{stepDescription}</p>
      </header>
      {formFields}
      {formFooter}
    </form>
  );

  if (variant === "page") {
    if (onboardingFullPage) {
      return (
        <section className="flex min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom,0px))] flex-col py-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">{pageForm}</div>
        </section>
      );
    }
    return (
      <section className="space-y-6">
        <BackNavLink href="/playbook" />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">{pageForm}</div>
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
        {modalInner}
      </DialogContent>
    </Dialog>
  );
}
