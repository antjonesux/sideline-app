"use client";

import { IconBackButton } from "@/components/shared/IconBackButton";
import { CallSheetMetadataRow } from "@/components/playbook/CallSheetMetadataRow";
import { appShellHeaderActionButtonClass, appShellPageTitleClass } from "@/lib/constants/designTokens";
import { callSheetDetailsMetadataLabels } from "@/lib/playbookUtils";
import type { CatalogPlaybookLookup } from "@/lib/playbooks/catalog-playbooks";
import { cn } from "@/lib/utils";

export function CallSheetBuilderSheetHeader({
  backHref,
  sheetName,
  cfb26Playbook,
  scheme,
  catalogMeta,
  onEditSheet,
}: {
  backHref: string;
  sheetName: string;
  cfb26Playbook: string;
  scheme?: string;
  catalogMeta?: CatalogPlaybookLookup | null;
  onEditSheet?: () => void;
}) {
  return (
    <div className={cn("flex items-start gap-3", onEditSheet ? "justify-between" : "")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconBackButton href={backHref} aria-label="Back to play sheets" />
        <div className="min-w-0">
          <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{sheetName}</h1>
          {catalogMeta ? (
            <CallSheetMetadataRow
              labels={callSheetDetailsMetadataLabels(catalogMeta, scheme, cfb26Playbook)}
              className="mt-1 font-body text-sm text-slate-400"
            />
          ) : (
            <p className="mt-1 truncate font-body text-sm text-slate-400">Built from {cfb26Playbook} playbook</p>
          )}
        </div>
      </div>
      {onEditSheet ? (
        <button
          type="button"
          className={appShellHeaderActionButtonClass}
          onClick={onEditSheet}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}
