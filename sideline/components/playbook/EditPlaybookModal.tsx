"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PlaybookSummary } from "@/lib/types";
import { COULDNT_LOAD, COULDNT_SAVE } from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PlaybookOption = { team_name: string };

const EDIT_PLAYBOOK_DIALOG_ID = "edit-playbook-dialog";

type Props = {
  playbook: PlaybookSummary;
  /** Controlled visibility — render outside menus so closing the menu does not unmount this component. */
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function EditPlaybookModal({ playbook, open, onClose, onSaved }: Props) {
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
        if (!cancelled) setLoadErr(COULDNT_LOAD);
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
        addToast(COULDNT_SAVE, "error");
        return;
      }
      await onSaved();
      addToast("Saved.", "success");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        id={EDIT_PLAYBOOK_DIALOG_ID}
        className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[90vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-xl border-slate-700 bg-slate-900 p-0 text-slate-100 sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg [&>button]:text-slate-400 [&>button]:hover:text-white"
      >
        <DialogHeader className="sticky top-0 z-10 space-y-0 border-b border-slate-800 bg-slate-900 px-4 py-4 text-left sm:px-6 sm:text-left">
          <DialogTitle className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100 pr-10 text-left">Edit play sheet</DialogTitle>
          <DialogDescription className="mt-1 text-left font-body text-sm text-slate-400">
            Update the name and CFB26 playbook source.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            {loadErr ? (
              <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
                {loadErr}
              </p>
            ) : null}

            <label className="block space-y-1">
              <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play sheet name</span>
              <input
                className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
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

          <div className="flex shrink-0 gap-3 border-t border-slate-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-5">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center font-body text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <Button type="submit" variant="default" className="min-h-11 flex-1" disabled={busy || !canSave}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
