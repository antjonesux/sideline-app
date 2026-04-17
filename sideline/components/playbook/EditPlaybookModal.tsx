"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import type { PlaybookSummary } from "@/lib/types";
import { useScrollLock } from "@/lib/useScrollLock";
import { useToastStore } from "@/store/toastStore";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";

type PlaybookOption = { team_name: string };

type Props = {
  playbook: PlaybookSummary;
  /** Controlled visibility — render outside menus so closing the menu does not unmount this component. */
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function EditPlaybookModal({ playbook, open, onClose, onSaved }: Props) {
  useScrollLock(open);
  const dialogId = useId();
  const [name, setName] = useState(playbook.name);
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>({
    team_name: playbook.cfb26_playbook,
  });
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const options = useMemo<PlaybookOption[]>(() => playbooks.map((p) => ({ team_name: p })), [playbooks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      const res = await fetch("/api/cfb26-playbooks");
      const j = (await res.json()) as { playbooks?: string[]; error?: string };
      if (!res.ok) {
        if (!cancelled) setLoadErr(j.error ?? "Could not load CFB26 playbooks");
        return;
      }
      if (!cancelled) setPlaybooks(j.playbooks ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(playbook.name);
    setSelectedPlaybook({ team_name: playbook.cfb26_playbook });
  }, [open, playbook.id, playbook.name, playbook.cfb26_playbook]);

  const canSave = name.trim().length > 0 && Boolean(selectedPlaybook);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave || !selectedPlaybook) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playbook/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cfb26_playbook: selectedPlaybook.team_name }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok || j.error) {
        addToast("Failed to save", "error");
        return;
      }
      await onSaved();
      addToast("Changes saved", "success");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      id={dialogId}
      className={`hs-overlay fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto ${
        open ? "pointer-events-auto bg-black/70" : "pointer-events-none hidden"
      }`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby={`${dialogId}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">
        <div
          className="pointer-events-auto flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-xl sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`${dialogId}-title`} className="app-modal-title">
                  Edit play sheet
                </h2>
                <p className="mt-1 font-body text-sm text-slate-400">Update the name and CFB26 playbook source.</p>
              </div>
              <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={onClose}>
                <span aria-hidden>✕</span>
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
              {loadErr ? (
                <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
                  {loadErr}
                </p>
              ) : null}

              <label className="block space-y-1">
                <span className="app-field-label">Play sheet name</span>
                <input
                  className="hs-input app-input"
                  placeholder="e.g. My Base Sheet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </label>

              <TeamCombobox<PlaybookOption>
                label="Select CFB26 Playbook"
                inputId={`edit-playbook-cfb26-${playbook.id}`}
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
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-800 p-3 sm:px-6 sm:py-5">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center font-body text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" disabled={busy || !canSave} className="btn-primary min-h-11 flex-1">
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
