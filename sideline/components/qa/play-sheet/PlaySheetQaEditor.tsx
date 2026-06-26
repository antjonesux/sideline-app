"use client";

import { AddPlayDrawer } from "@/components/playbook/AddPlayDrawer";
import { PlaySlot } from "@/components/playbook/PlaySlot";
import { PlaySuggestions } from "@/components/playbook/PlaySuggestions";
import { SituationList } from "@/components/playbook/SituationList";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { Button } from "@/components/ui/button";
import type { SuggestionRow } from "@/lib/loggedPlayStats";
import type { PlaybookEntry } from "@/lib/playbook";
import { maxSlotsForSheetScenario, scenarioDisplayLabel } from "@/lib/playbookUtils";
import { appShellPageTitleClass, modalCtaFooterClass, overlayZ } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useCallback, useState } from "react";

type EditUi = {
  sheetName: string;
  cfb26Playbook: string;
  playbookOptions: string[];
};

type DrawerUi = {
  open: boolean;
  scenarioName: string;
  catalogEntries: PlaybookEntry[];
  initialUi?: { step: "formations" | "plays"; formation?: { group: string; name: string } };
};

type Props = {
  sheetName: string;
  cfb26Playbook: string;
  scenarios: SheetScenarioBlock[];
  activeScenario: string;
  plays: SheetPlayRow[];
  suggestions?: SuggestionRow[];
  emptyScenario?: boolean;
  editUi?: EditUi | null;
  drawerUi?: DrawerUi | null;
};

export function PlaySheetQaEditor({
  sheetName,
  cfb26Playbook,
  scenarios,
  activeScenario,
  plays,
  suggestions = [],
  emptyScenario = false,
  editUi = null,
  drawerUi = null,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const noop = useCallback(() => {}, []);
  const maxSlots = maxSlotsForSheetScenario(activeScenario);
  const filled = plays.length;
  const atCapacity = filled >= maxSlots;

  const playSlotProps = {
    onAdd: noop,
    onRemove: () => Promise.resolve(),
    dragId,
    setDragId,
    onReorder: noop,
  } as const;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb segments={[{ label: "Play Sheet", href: "/playbook" }, { label: sheetName }]} />
        <BackNavLink href="/playbook" />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{sheetName}</h1>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Edit
          </button>
        </div>
        <p className="font-body text-sm text-slate-400">Built from {cfb26Playbook} playbook</p>
      </div>

      <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={noop} variant="mobile" />

      <div className="grid min-h-[50vh] gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Situations</p>
          <SituationList scenarios={scenarios} activeScenario={activeScenario} onSelect={noop} variant="desktop" />
        </aside>

        <section className="min-w-0 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-slate-200">
            Calls for: <span className="text-white">{scenarioDisplayLabel(activeScenario)}</span>
          </h2>

          {emptyScenario ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
              <p className="font-body text-base font-medium text-white">No calls for this situation yet.</p>
              <p className="mt-1 font-body text-sm text-slate-400">Add calls to build your call sheet.</p>
              <Button type="button" variant="default" className="mt-4 text-sm">
                Add call
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/90">
              <PlayTableHeader />
              <div>
                {plays.map((play, slotIndex) => (
                  <PlaySlot
                    key={play.id}
                    play={play}
                    slotIndex={slotIndex}
                    {...playSlotProps}
                    atCapacity={atCapacity && !play}
                  />
                ))}
                {filled < maxSlots ? (
                  <PlaySlot
                    key="slot-add-next"
                    play={null}
                    slotIndex={filled}
                    {...playSlotProps}
                    atCapacity={atCapacity}
                  />
                ) : null}
              </div>
            </div>
          )}

          {suggestions.length > 0 ? (
            <PlaySuggestions
              scenarioLabel={activeScenario}
              suggestions={suggestions}
              busyId={null}
              onAdd={noop}
              scenarioFull={atCapacity}
            />
          ) : null}
        </section>
      </div>

      {drawerUi?.open ? (
        <AddPlayDrawer
          open
          onClose={noop}
          cfb26Playbook={cfb26Playbook}
          scenarioName={drawerUi.scenarioName}
          onPick={noop}
          qaStaticEntries={drawerUi.catalogEntries}
          qaInitialUi={drawerUi.initialUi}
        />
      ) : null}

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
    </div>
  );
}
