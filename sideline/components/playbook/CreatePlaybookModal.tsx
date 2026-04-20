"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useScrollLock } from "@/lib/useScrollLock";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { COULDNT_LOAD, COULDNT_SAVE } from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";

type PlaybookOption = { team_name: string };

type Props = {
  /** When true, render as a full page (no dim backdrop framing). */
  variant?: "page" | "modal";
  open?: boolean;
  onClose?: () => void;
};

export function CreatePlaybookModal({ variant = "page", open = true, onClose }: Props) {
  useScrollLock(variant === "modal" && open);
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>(null);
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, []);

  const options = useMemo<PlaybookOption[]>(() => playbooks.map((p) => ({ team_name: p })), [playbooks]);

  const canStep1 = name.trim().length > 0 && Boolean(selectedPlaybook);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (canStep1) setStep(2);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cfb26_playbook: selectedPlaybook!.team_name }),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      if (j.id) {
        addToast("Play sheet created", "success");
        if (variant === "modal") onClose?.();
        router.push(`/playbook/${j.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  if (variant === "modal" && !open) return null;

  const inner = (
    <div
      className={`mx-auto flex flex-col border border-slate-700 bg-slate-900 shadow-xl ${
        variant === "page"
          ? "w-full max-w-lg rounded-xl"
          : "m-0 max-h-[85vh] w-full overflow-y-auto rounded-xl sm:w-full sm:max-w-lg"
      }`}
    >
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="app-modal-title">New play sheet</h2>
            <p className="mt-1 font-body text-sm text-slate-400">
              {step === 1 ? "Step 1 of 2 — play sheet name and CFB26 playbook" : "Step 2 of 2 — start building"}
            </p>
          </div>
          {variant === "modal" ? (
            <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => onClose?.()}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {loadErr ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
              {loadErr}
            </p>
          ) : null}

          {step === 1 ? (
            <>
              <label className="block space-y-1">
                <span className="app-field-label">Play sheet name</span>
                <input
                  className="hs-input app-input"
                  placeholder="e.g. My Base Sheet, vs 3-3-5, Run Heavy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </label>

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
              <p className="text-slate-500">We will create 15 empty situation slots on your play sheet. You can add plays in the editor.</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-800 p-3 sm:px-6 sm:py-5">
          {step === 2 ? (
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>
              Back
            </button>
          ) : variant === "modal" ? (
            <button type="button" className="btn-secondary flex-1" onClick={() => onClose?.()}>
              Cancel
            </button>
          ) : (
            <button type="button" className="btn-secondary flex-1" onClick={() => router.push("/playbook")}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={busy || (step === 1 && !canStep1)} className="btn-primary flex-1">
            {step === 1 ? "Continue" : busy ? "Creating…" : "Create play sheet & open"}
          </button>
        </div>
      </form>
    </div>
  );

  if (variant === "page") {
    return (
      <section className="space-y-6">
        <Breadcrumb segments={[{ label: "Playbook", href: "/playbook" }, { label: "New" }]} />
        <h1 className="app-page-title">New Play Sheet</h1>
        {inner}
      </section>
    );
  }

  return (
    <div
      className={`hs-overlay fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto ${
        open ? "pointer-events-auto bg-black/70" : "pointer-events-none hidden"
      }`}
      role="dialog"
      aria-modal={open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">{inner}</div>
    </div>
  );
}
