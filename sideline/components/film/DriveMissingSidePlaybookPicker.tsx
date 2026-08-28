"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import {
  CATALOG_SIDE_OF_BALL_LABELS,
  parseCatalogGameVersion,
  type CatalogGameVersion,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { useCatalogPlaybooks } from "@/hooks/useCatalogPlaybooks";
import {
  getCatalogPlaybookSectionForSide,
  getCatalogSectionsForSide,
  sortCatalogPlaybookNamesForSide,
} from "@/lib/playbooks/generic-playbooks";
import { useMemo } from "react";

type PlaybookOption = { team_name: string };

type DriveMissingSidePlaybookPickerProps = {
  sideOfBall: CatalogSideOfBall;
  gameVersion: CatalogGameVersion | string | null | undefined;
  selectedPlaybook: string | null;
  onPlaybookChange: (playbook: string | null) => void;
};

/** Compact playbook picker when adding a drive on a side the game was not created with. */
export function DriveMissingSidePlaybookPicker({
  sideOfBall,
  gameVersion,
  selectedPlaybook,
  onPlaybookChange,
}: DriveMissingSidePlaybookPickerProps) {
  const resolvedVersion = parseCatalogGameVersion(gameVersion ?? undefined);
  const { playbooks, loading: playbooksLoading } = useCatalogPlaybooks({
    gameVersion: resolvedVersion,
    sideOfBall,
  });

  const playbookOptions = useMemo<PlaybookOption[]>(
    () => sortCatalogPlaybookNamesForSide(playbooks, sideOfBall).map((name) => ({ team_name: name })),
    [playbooks, sideOfBall],
  );

  const playbookRow = useMemo(() => {
    if (!selectedPlaybook) return null;
    return playbookOptions.find((row) => row.team_name === selectedPlaybook) ?? null;
  }, [playbookOptions, selectedPlaybook]);

  const catalogSections = useMemo(() => [...getCatalogSectionsForSide(sideOfBall)], [sideOfBall]);
  const sideLabel = CATALOG_SIDE_OF_BALL_LABELS[sideOfBall];

  return (
    <fieldset className="space-y-2 rounded-lg border border-amber-600/40 bg-amber-950/20 px-3 py-3">
      <legend className="px-1 font-sans text-sm font-medium text-amber-100">
        {sideLabel} playbook required
      </legend>
      <p className="font-body text-xs text-slate-400">
        This game was not set up with a {sideLabel.toLowerCase()} playbook. Pick one to save with this drive.
      </p>
      <TeamCombobox<PlaybookOption>
        label={`${sideLabel} playbook`}
        inputId={`drive-setup-${sideOfBall}-playbook`}
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
    </fieldset>
  );
}
