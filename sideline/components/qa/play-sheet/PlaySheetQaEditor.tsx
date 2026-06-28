"use client";

import { CallSheetBuilderDashboard } from "@/components/playbook/CallSheetBuilderDashboard";
import { CallSheetBuilderSheetHeader } from "@/components/playbook/CallSheetBuilderSheetHeader";
import { CallSheetCoachView } from "@/components/playbook/CallSheetCoachView";
import { CallSheetEditorTabBar, type CallSheetEditorTab } from "@/components/playbook/CallSheetEditorTabBar";
import { Button } from "@/components/ui/button";
import { modalCtaFooterClass, overlayZ } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { SheetScenarioBlock } from "@/lib/types";
import { useState } from "react";

type EditUi = {
  sheetName: string;
  cfb26Playbook: string;
  playbookOptions: string[];
};

type Props = {
  sheetName: string;
  cfb26Playbook: string;
  scenarios: SheetScenarioBlock[];
  editUi?: EditUi | null;
};

export function PlaySheetQaEditor({
  sheetName,
  cfb26Playbook,
  scenarios,
  editUi = null,
}: Props) {
  const [editorTab, setEditorTab] = useState<CallSheetEditorTab>("situations");

  return (
    <>
      <div className="space-y-6">
        <CallSheetBuilderSheetHeader
          backHref="/playbook"
          sheetName={sheetName}
          cfb26Playbook={cfb26Playbook}
          onEditSheet={() => {}}
        />
        <CallSheetEditorTabBar activeTab={editorTab} onTabChange={setEditorTab} />
        {editorTab === "situations" ? (
          <CallSheetBuilderDashboard
            scenarios={scenarios}
            onBrowsePlaybook={() => {}}
            onSelectSituation={() => {}}
          />
        ) : (
          <CallSheetCoachView scenarios={scenarios} />
        )}
      </div>

      {editUi ? (
        <div className={cn("fixed inset-0 bg-black/70", overlayZ.radixDialog)}>
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4",
              overlayZ.sheetShell,
            )}
          >
            <div className="flex h-full max-h-[90vh] min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Edit play sheet</h2>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
                    Play sheet name
                  </span>
                  <input
                    readOnly
                    value={editUi.sheetName}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
                    Select CFB26 Playbook
                  </span>
                  <input
                    readOnly
                    list="play-sheet-qa-cfb26-options"
                    value={editUi.cfb26Playbook}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100"
                  />
                  <datalist id="play-sheet-qa-cfb26-options">
                    {editUi.playbookOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
              </div>
              <div className={modalCtaFooterClass}>
                <Button type="button" variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button type="button" variant="default" className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
