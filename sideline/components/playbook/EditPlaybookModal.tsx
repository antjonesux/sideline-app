"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { CatalogSideOfBallField } from "@/components/playbook/CatalogSideOfBallField";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { useCatalogPlaybooks } from "@/hooks/useCatalogPlaybooks";
import type { PlaybookSummary } from "@/lib/types";
import { modalCtaFooterClass } from "@/lib/constants/designTokens";
import {
  CATALOG_GAME_VERSION_LABELS,
  CATALOG_GAME_VERSIONS,
  parseCatalogGameVersion,
  type CatalogGameVersion,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { COULDNT_LOAD, COULDNT_SAVE, PLAYBOOK_SELECT_EMPTY, PLAYBOOK_SELECT_LOADING, PLAYBOOK_SELECT_PLACEHOLDER } from "@/lib/coachCopy";
import {
  getCatalogPlaybookSectionForSide,
  getCatalogSectionsForSide,
  sortCatalogPlaybookNamesForSide,
} from "@/lib/playbooks/generic-playbooks";
import { lookupCatalogPlaybookMeta } from "@/lib/playbooks/catalog-playbooks";
import { useToastStore } from "@/store/toastStore";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedGameVersion, setSelectedGameVersion] = useState<CatalogGameVersion>(() =>
    parseCatalogGameVersion(playbook.game_version),
  );
  const [selectedSide, setSelectedSide] = useState<CatalogSideOfBall | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookOption | null>({
    team_name: playbook.playbook,
  });
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const { playbooks, loading: playbooksLoading, failed: loadErr } = useCatalogPlaybooks({
    gameVersion: selectedGameVersion,
    sideOfBall: selectedSide,
    enabled: open && Boolean(selectedSide),
  });

  const options = useMemo<PlaybookOption[]>(() => {
    if (!selectedSide) return [];
    return sortCatalogPlaybookNamesForSide(playbooks, selectedSide).map((p) => ({ team_name: p }));
  }, [playbooks, selectedSide]);

  const catalogSections = useMemo(
    () => (selectedSide ? [...getCatalogSectionsForSide(selectedSide)] : []),
    [selectedSide],
  );

  const playbookPickerDisabled = !selectedSide || (!playbooksLoading && !loadErr && playbooks.length === 0);
  const catalogEmpty = Boolean(selectedSide) && !playbooksLoading && !loadErr && playbooks.length === 0;

  useEffect(() => {
    if (!open) return;
    setName(playbook.name);
    setSelectedPlaybook({ team_name: playbook.playbook });
    setHydrating(true);

    let cancelled = false;
    void (async () => {
      const [meta, sheetRes] = await Promise.all([
        lookupCatalogPlaybookMeta(playbook.playbook),
        fetch(`/api/playbook/${playbook.id}`, { cache: "no-store" }),
      ]);
      if (cancelled) return;

      let sheetVersion = playbook.game_version;
      if (sheetRes.ok) {
        const sheet = (await sheetRes.json()) as { game_version?: string | null };
        if (sheet.game_version?.trim()) {
          sheetVersion = sheet.game_version;
        }
      }

      setSelectedGameVersion(parseCatalogGameVersion(sheetVersion));
      if (meta) {
        setSelectedSide(meta.side_of_ball);
      } else {
        setSelectedSide("offense");
      }
      setHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, playbook.id, playbook.name, playbook.playbook, playbook.game_version]);

  useEffect(() => {
    if (!open || hydrating || !selectedSide) return;
    const saved = playbook.playbook.trim();
    if (!saved) return;
    if (playbooks.some((p) => p.trim() === saved)) {
      setSelectedPlaybook({ team_name: saved });
    }
  }, [open, hydrating, playbook.playbook, playbooks, selectedSide]);

  function handleGameChange(value: CatalogGameVersion) {
    setSelectedGameVersion(value);
  }

  function handleSideChange(side: CatalogSideOfBall) {
    setSelectedSide(side);
    setSelectedPlaybook(null);
  }

  const canSave = name.trim().length > 0 && Boolean(selectedPlaybook) && Boolean(selectedSide);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave || !selectedPlaybook) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playbook/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          playbook: selectedPlaybook.team_name,
          game_version: selectedGameVersion,
        }),
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
    <ResponsiveOverlay open={open} onClose={onClose} busy={busy} maxWidth="lg">
      <DialogHeader
        id={EDIT_PLAYBOOK_DIALOG_ID}
        className="sticky top-0 z-10 space-y-0 border-b border-slate-800 bg-slate-900 px-4 py-4 text-left md:px-6 md:text-left"
      >
        <DialogTitle className="pr-10 text-left font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100">
          Edit play sheet
        </DialogTitle>
        <DialogDescription className="mt-1 text-left font-body text-sm text-slate-400">
          Update the name and playbook source.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-5 overflow-y-auto px-4 py-5 md:px-6">
          {loadErr ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 font-body text-sm text-amber-100" role="alert">
              {COULDNT_LOAD}
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

          <label className="block space-y-1">
            <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Select Game</span>
            <Select
              value={selectedGameVersion}
              onValueChange={(value) => handleGameChange(value as CatalogGameVersion)}
              disabled={hydrating}
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

          <CatalogSideOfBallField
            value={selectedSide}
            onChange={handleSideChange}
            disabled={hydrating || !selectedGameVersion}
          />

          <TeamCombobox<PlaybookOption>
            label="Select Playbook"
            inputId={`edit-playbook-cfb26-${playbook.id}`}
            selected={selectedPlaybook}
            onSelect={setSelectedPlaybook}
            options={options}
            loading={playbooksLoading || hydrating}
            disabled={playbookPickerDisabled || hydrating}
            placeholder={PLAYBOOK_SELECT_PLACEHOLDER}
            emptyOptionsMessage={PLAYBOOK_SELECT_EMPTY}
            getOptionLabel={(o) => o.team_name}
            getOptionKey={(o) => o.team_name}
            getSearchText={(o) => o.team_name}
            getOptionSection={
              selectedSide
                ? (o) => getCatalogPlaybookSectionForSide(o.team_name, selectedSide)
                : undefined
            }
            optionSections={catalogSections}
            showTrailingChevron={false}
          />
          {playbooksLoading && selectedSide ? (
            <p className="font-body text-xs text-slate-500" role="status">
              {PLAYBOOK_SELECT_LOADING}
            </p>
          ) : null}
          {catalogEmpty ? (
            <p className="font-body text-xs text-slate-500" role="status">
              {PLAYBOOK_SELECT_EMPTY}
            </p>
          ) : null}
          <p className="font-body text-xs text-slate-500">This controls which formations and plays appear in the picker.</p>
        </div>

        <div className={modalCtaFooterClass}>
          <Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default" className="min-h-11 flex-1" disabled={busy || !canSave || hydrating}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </ResponsiveOverlay>
  );
}
