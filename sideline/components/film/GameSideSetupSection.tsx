"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { overlayZ } from "@/lib/constants/designTokens";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import { useCatalogPlaybooks } from "@/hooks/useCatalogPlaybooks";
import {
  getCatalogPlaybookSectionForSide,
  getCatalogSectionsForSide,
  sortCatalogPlaybookNamesForSide,
} from "@/lib/playbooks/generic-playbooks";
import type { PlaybookSummary } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlaybookOption = { team_name: string };

/** Mobile bottom tab bar + page pb clearance — keep call sheet menus above the nav. */
const BOTTOM_NAV_CLEARANCE_PX = 112;
const CALL_SHEET_MENU_MIN_HEIGHT_PX = 180;

type CallSheetPickerProps = {
  sheets: PlaybookSummary[];
  loading: boolean;
  value: string | null;
  onChange: (sheetId: string | null) => void;
};

export function CallSheetPicker({ sheets, loading, value, onChange }: CallSheetPickerProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => sheets.find((sheet) => sheet.id === value) ?? null,
    [sheets, value],
  );

  const updateDropPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - BOTTOM_NAV_CLEARANCE_PX;
    setDropUp(spaceBelow < CALL_SHEET_MENU_MIN_HEIGHT_PX);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropPosition();
    const onLayout = () => updateDropPosition();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateDropPosition]);

  const placeholder = loading ? "Loading call sheets…" : "Select call sheet";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="hs-input flex h-auto w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          if (loading) return;
          setOpen((prev) => {
            const next = !prev;
            if (next) updateDropPosition();
            return next;
          });
        }}
      >
        <span className={selected ? "truncate" : "truncate text-slate-500"}>
          {selected?.name ?? placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-slate-400 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute left-0 right-0 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 text-sm shadow-lg ${overlayZ.filmBackdrop} ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm text-slate-100 hover:bg-slate-800/80"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            None
          </button>
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              role="option"
              aria-selected={value === sheet.id}
              className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm text-slate-100 last:border-b-0 hover:bg-slate-800/80"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(sheet.id);
                setOpen(false);
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type GameSideSetupSectionProps = {
  sideLabel: string;
  sideOfBall: CatalogSideOfBall;
  gameVersion: CatalogGameVersion;
  sheets: PlaybookSummary[];
  sheetsLoading: boolean;
  selectedSheetId: string | null;
  onSheetChange: (sheetId: string | null) => void;
  selectedPlaybook: string | null;
  onPlaybookChange: (playbook: string | null) => void;
  playbookLabel: string;
};

export function GameSideSetupSection({
  sideLabel,
  sideOfBall,
  gameVersion,
  sheets,
  sheetsLoading,
  selectedSheetId,
  onSheetChange,
  selectedPlaybook,
  onPlaybookChange,
  playbookLabel,
}: GameSideSetupSectionProps) {
  const { playbooks, loading: playbooksLoading } = useCatalogPlaybooks({
    gameVersion,
    sideOfBall,
  });

  const playbookOptions = useMemo<PlaybookOption[]>(
    () => sortCatalogPlaybookNamesForSide(playbooks, sideOfBall).map((name) => ({ team_name: name })),
    [playbooks, sideOfBall],
  );

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedSheetId) ?? null,
    [sheets, selectedSheetId],
  );

  const derivedPlaybookName = selectedSheet?.playbook?.trim() ?? "";

  const playbookRow = useMemo(() => {
    if (!selectedPlaybook) return null;
    return playbookOptions.find((row) => row.team_name === selectedPlaybook) ?? null;
  }, [playbookOptions, selectedPlaybook]);

  useEffect(() => {
    if (!selectedPlaybook || playbookOptions.length === 0) return;
    if (!playbookOptions.some((row) => row.team_name === selectedPlaybook)) {
      onPlaybookChange(null);
    }
  }, [onPlaybookChange, playbookOptions, selectedPlaybook]);

  useEffect(() => {
    if (!selectedSheetId) return;
    if (!sheets.some((sheet) => sheet.id === selectedSheetId)) {
      onSheetChange(null);
    }
  }, [onSheetChange, selectedSheetId, sheets]);

  const catalogSections = useMemo(() => [...getCatalogSectionsForSide(sideOfBall)], [sideOfBall]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="font-sans text-sm font-semibold text-white">{sideLabel}</h3>

      <label className="block space-y-1">
        <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
          Call Sheet
        </span>
        <CallSheetPicker
          sheets={sheets}
          loading={sheetsLoading}
          value={selectedSheetId}
          onChange={onSheetChange}
        />
        {!sheetsLoading && sheets.length === 0 ? (
          <p className="font-body text-xs text-slate-500">
            No {sideOfBall === "offense" ? "offensive" : "defensive"} call sheets for this game version yet.
          </p>
        ) : null}
      </label>

      {selectedSheet ? (
        <p className="font-body text-sm text-slate-300">
          <span className="text-slate-400">{playbookLabel}:</span> {derivedPlaybookName || "—"}
        </p>
      ) : (
        <div className="space-y-1">
          <TeamCombobox<PlaybookOption>
            label={playbookLabel}
            inputId={`film-${sideOfBall}-playbook`}
            selected={playbookRow}
            onSelect={(row) => onPlaybookChange(row?.team_name ?? null)}
            options={playbookOptions}
            loading={playbooksLoading}
            placeholder="Select playbook"
            getOptionLabel={(row) => row.team_name}
            getOptionKey={(row) => row.team_name}
            getSearchText={(row) => row.team_name}
            getOptionSection={(row) => getCatalogPlaybookSectionForSide(row.team_name, sideOfBall)}
            optionSections={catalogSections}
          />
        </div>
      )}
    </div>
  );
}
