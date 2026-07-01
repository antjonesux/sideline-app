"use client";

import { useCallSheetsForSide } from "@/hooks/useCallSheetsForSide";
import { usePlaybookList } from "@/hooks/usePlaybookList";
import {
  SCHEME_FORM_DEFENSE_SHEET_LABEL,
  SCHEME_FORM_OFFENSE_SHEET_LABEL,
  SCHEME_FORM_SHEET_NONE,
  SCHEME_FORM_SHEET_PLACEHOLDER,
  SCHEME_FORM_SHEETS_EMPTY,
  SCHEME_FORM_SHEETS_EMPTY_HINT,
  SCHEME_FORM_SHEETS_LOADING,
} from "@/lib/coachCopy";
import type { CatalogSideOfBall } from "@/lib/constants";
import type { PlaybookSummary } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useMemo } from "react";

const NONE_VALUE = "__none__";

type PinnedSheet = Pick<PlaybookSummary, "id" | "name">;

function pinnedSheetOption(sheet: PinnedSheet): PlaybookSummary {
  return {
    id: sheet.id,
    name: sheet.name,
    cfb26_playbook: "",
    scheme: "",
    scenario_filled: 0,
    scenario_total: 0,
    play_count: 0,
    updated_at: null,
  };
}

function buildPickerOptions(
  sheets: PlaybookSummary[],
  allSheets: PlaybookSummary[],
  value: string | null,
  excludeSheetId: string | null | undefined,
  pinnedSheet: PinnedSheet | null | undefined,
): PlaybookSummary[] {
  let filtered = sheets.filter((sheet) => sheet.id !== excludeSheetId);

  if (
    pinnedSheet &&
    pinnedSheet.id !== excludeSheetId &&
    !filtered.some((sheet) => sheet.id === pinnedSheet.id)
  ) {
    filtered = [pinnedSheetOption(pinnedSheet), ...filtered];
  }

  if (!value || filtered.some((sheet) => sheet.id === value)) return filtered;

  const selected = allSheets.find((sheet) => sheet.id === value);
  if (selected && selected.id !== excludeSheetId) {
    return [selected, ...filtered];
  }

  return filtered;
}

type Props = {
  side: CatalogSideOfBall;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  excludeSheetId?: string | null;
  disabled?: boolean;
  pinnedSheet?: PinnedSheet | null;
};

export function SchemeCallSheetPicker({
  side,
  label,
  value,
  onChange,
  excludeSheetId,
  disabled = false,
  pinnedSheet,
}: Props) {
  const { sheets, isLoading } = useCallSheetsForSide(side);
  const { data: playbookData } = usePlaybookList();
  const allSheets = playbookData?.playbooks ?? [];
  const options = useMemo(
    () => buildPickerOptions(sheets, allSheets, value, excludeSheetId, pinnedSheet),
    [allSheets, excludeSheetId, pinnedSheet, sheets, value],
  );
  const selectValue = value ?? NONE_VALUE;
  const selectedLabel =
    selectValue === NONE_VALUE
      ? null
      : options.find((sheet) => sheet.id === value)?.name ?? pinnedSheet?.name ?? null;

  return (
    <label className="block space-y-1">
      <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">{label}</span>
      <Select
        key={`${side}-${selectValue}-${options.length}`}
        value={selectValue}
        onValueChange={(next) => onChange(next === NONE_VALUE ? null : next)}
        disabled={disabled || (isLoading && !value)}
      >
        <SelectTrigger className="hs-input h-auto w-full rounded-lg border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:ring-emerald-500/25">
          <SelectValue placeholder={SCHEME_FORM_SHEET_PLACEHOLDER}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
          <SelectItem
            value={NONE_VALUE}
            className="font-body text-sm text-slate-100 focus:bg-slate-800 focus:text-white"
          >
            {SCHEME_FORM_SHEET_NONE}
          </SelectItem>
          {options.map((sheet) => (
            <SelectItem
              key={sheet.id}
              value={sheet.id}
              className="font-body text-sm text-slate-100 focus:bg-slate-800 focus:text-white"
            >
              {sheet.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading ? (
        <p className="font-body text-xs text-slate-500" role="status">
          {SCHEME_FORM_SHEETS_LOADING}
        </p>
      ) : null}
      {!isLoading && options.length === 0 ? (
        <p className="font-body text-xs text-slate-500">
          {SCHEME_FORM_SHEETS_EMPTY}{" "}
          <Link href="/playbook/new" className="text-emerald-400 hover:text-emerald-300">
            {SCHEME_FORM_SHEETS_EMPTY_HINT}
          </Link>
        </p>
      ) : null}
    </label>
  );
}

export function SchemeCallSheetPickers({
  offenseSheetId,
  defenseSheetId,
  onOffenseChange,
  onDefenseChange,
  disabled = false,
  offensePinnedSheet,
  defensePinnedSheet,
}: {
  offenseSheetId: string | null;
  defenseSheetId: string | null;
  onOffenseChange: (id: string | null) => void;
  onDefenseChange: (id: string | null) => void;
  disabled?: boolean;
  offensePinnedSheet?: PinnedSheet | null;
  defensePinnedSheet?: PinnedSheet | null;
}) {
  return (
    <>
      <SchemeCallSheetPicker
        side="offense"
        label={SCHEME_FORM_OFFENSE_SHEET_LABEL}
        value={offenseSheetId}
        onChange={onOffenseChange}
        excludeSheetId={defenseSheetId}
        disabled={disabled}
        pinnedSheet={offensePinnedSheet}
      />
      <SchemeCallSheetPicker
        side="defense"
        label={SCHEME_FORM_DEFENSE_SHEET_LABEL}
        value={defenseSheetId}
        onChange={onDefenseChange}
        excludeSheetId={offenseSheetId}
        disabled={disabled}
        pinnedSheet={defensePinnedSheet}
      />
    </>
  );
}
