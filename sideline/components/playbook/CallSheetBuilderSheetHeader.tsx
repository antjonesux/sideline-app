"use client";

import { IconBackButton } from "@/components/shared/IconBackButton";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

export function CallSheetBuilderSheetHeader({
  backHref,
  sheetName,
  cfb26Playbook,
  onEditSheet,
}: {
  backHref: string;
  sheetName: string;
  cfb26Playbook: string;
  onEditSheet?: () => void;
}) {
  return (
    <div className={cn("flex items-start gap-3", onEditSheet ? "justify-between" : "")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconBackButton href={backHref} aria-label="Back to play sheets" />
        <div className="min-w-0">
          <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{sheetName}</h1>
          <p className="mt-1 font-body text-sm text-slate-400">Built from {cfb26Playbook} playbook</p>
        </div>
      </div>
      {onEditSheet ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          onClick={onEditSheet}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}
