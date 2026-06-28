"use client";

import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { getSituationColor } from "@/lib/constants";
import { appShellHeaderActionButtonClass, appShellPageTitleClass } from "@/lib/constants/designTokens";
import { callSheetScenarioHelperText } from "@/lib/playbookUtils";
import { cn } from "@/lib/utils";

export function CallSheetBuilderSituationHeader({
  backHref,
  title,
  scenario,
  description,
  colorKey,
  icon,
  playCountLabel,
  showEdit,
  onEdit,
}: {
  backHref: string;
  title: string;
  scenario: string;
  description?: string | null;
  colorKey?: string;
  icon?: string | null;
  playCountLabel: string;
  showEdit?: boolean;
  onEdit?: () => void;
}) {
  const subtitle = callSheetScenarioHelperText(scenario, description);
  const colors = colorKey ? getSituationColor(colorKey) : null;

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
            {subtitle ? <p className="mt-1 font-body text-sm text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        <p className="shrink-0 pt-1 font-body text-sm text-slate-400">{playCountLabel}</p>
      </div>
    </div>
  );
}
