"use client";

import { CallSheetViewerPlayRow } from "@/components/playbook/CallSheetViewerPlayRow";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { CALL_SHEET_VIEWER_SITUATION_EMPTY } from "@/lib/coachCopy";
import { callSheetScenarioDisplayName, isCallSheetScenario } from "@/lib/playbookUtils";
import type { SheetPlayRow } from "@/lib/types";

export function CallSheetViewerSituation({
  backHref,
  activeScenario,
  plays,
}: {
  backHref: string;
  activeScenario: string;
  plays: SheetPlayRow[];
}) {
  const title = isCallSheetScenario(activeScenario)
    ? callSheetScenarioDisplayName(activeScenario)
    : activeScenario;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <IconBackButton href={backHref} aria-label="Back to situations" />
        <h1 className="min-w-0 flex-1 truncate font-sans text-lg font-semibold text-white">{title}</h1>
      </header>

      {plays.length === 0 ? (
        <p className="py-6 text-center font-body text-sm text-slate-400">{CALL_SHEET_VIEWER_SITUATION_EMPTY}</p>
      ) : (
        <div className="divide-y divide-slate-800">
          {plays.map((play) => (
            <CallSheetViewerPlayRow key={play.id} play={play} />
          ))}
        </div>
      )}
    </div>
  );
}
