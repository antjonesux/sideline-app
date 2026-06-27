"use client";

import { CallSheetViewerFullSheet } from "@/components/playbook/CallSheetViewerFullSheet";
import { CallSheetViewerHeader } from "@/components/playbook/CallSheetViewerHeader";
import type { PlaybookSummary, SheetScenarioBlock } from "@/lib/types";

export function CallSheetViewerHome({
  sheetName,
  sheets,
  activeSheetId,
  scenarios,
}: {
  sheetName: string;
  sheets: PlaybookSummary[];
  activeSheetId: string;
  scenarios: SheetScenarioBlock[];
}) {
  return (
    <div className="space-y-4">
      <CallSheetViewerHeader sheetName={sheetName} sheets={sheets} activeSheetId={activeSheetId} />
      <CallSheetViewerFullSheet scenarios={scenarios} />
    </div>
  );
}
