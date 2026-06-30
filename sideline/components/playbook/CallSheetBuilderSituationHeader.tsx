"use client";

import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { SituationPlayTypeSummary } from "@/components/playbook/SituationPlayTypeSummary";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { getSituationColor } from "@/lib/constants";
import {
  appShellHeaderActionButtonClass,
  appShellIconBackButtonClass,
  appShellPageTitleClass,
} from "@/lib/constants/designTokens";
import { callSheetScenarioHelperText } from "@/lib/playbookUtils";
import type { SheetPlayRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CallSheetBuilderSituationHeader({
  backHref,
  title,
  scenario,
  description,
  colorKey,
  icon,
  playCountLabel,
  plays = [],
  showEdit,
  onEdit,
  layout = "mobile",
}: {
  backHref: string;
  title: string;
  scenario: string;
  description?: string | null;
  colorKey?: string;
  icon?: string | null;
  playCountLabel: string;
  plays?: SheetPlayRow[];
  showEdit?: boolean;
  onEdit?: () => void;
  /** `mobile` preserves the shipped mobile stack; `workspace` is the compact md+ header. */
  layout?: "mobile" | "workspace";
}) {
  const subtitle = callSheetScenarioHelperText(scenario, description);
  const colors = colorKey ? getSituationColor(colorKey) : null;
  const workspace = layout === "workspace";

  if (workspace) {
    return (
      <div className="mb-4 flex items-center justify-between gap-4 md:mb-5">
        <div className="flex min-w-0 items-center gap-3">
          <IconBackButton
            href={backHref}
            aria-label="Back to situations"
            className={cn(appShellIconBackButtonClass, "md:size-10")}
          />
          {colors ? (
            <span
              className={cn(
                "pointer-events-none flex size-9 shrink-0 items-center justify-center rounded-xl md:size-10",
                colors.bg,
              )}
              aria-hidden
            >
              <SituationIconBadge icon={icon} colorKey={colorKey ?? "blue"} name={scenario} size="md" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-sans text-xl font-bold uppercase leading-tight tracking-[0.06em] text-white md:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 truncate font-body text-xs text-slate-500 md:text-sm lg:max-w-md">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <p className="font-body text-xs text-slate-400 md:text-sm">{playCountLabel}</p>
          {showEdit && onEdit ? (
            <button
              type="button"
              className={cn(appShellHeaderActionButtonClass, "md:min-h-10 md:px-4")}
              onClick={onEdit}
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <IconBackButton href={backHref} aria-label="Back to situations" />
        {showEdit && onEdit ? (
          <button type="button" className={appShellHeaderActionButtonClass} onClick={onEdit}>
            Edit
          </button>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {colors ? (
            <span
              className={cn(
                "pointer-events-none flex shrink-0 items-center justify-center rounded-xl p-2.5",
                colors.bg,
              )}
              aria-hidden
            >
              <SituationIconBadge icon={icon} colorKey={colorKey ?? "blue"} name={scenario} size="md" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{title}</h1>
            <SituationPlayTypeSummary plays={plays} className="mt-2" />
            {subtitle ? <p className="mt-1 font-body text-sm text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        <p className="shrink-0 pt-1 font-body text-sm text-slate-400">{playCountLabel}</p>
      </div>
    </div>
  );
}
