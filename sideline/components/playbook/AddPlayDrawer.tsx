"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { PlayBrowser } from "@/components/film/PlayBrowser";
import { scenarioDisplayLabel } from "@/lib/playbookUtils";
import { useScrollLock } from "@/lib/useScrollLock";
import { normalizePlayName } from "@/lib/utils";

export function AddPlayDrawer({
  open,
  onClose,
  cfb26Playbook,
  scenarioName,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  cfb26Playbook: string;
  scenarioName: string;
  onPick: (formation: string, playName: string) => void;
}) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/60"
        aria-hidden
        onClick={() => {
          onClose();
        }}
      />
      <div
        className="fixed inset-0 z-[201] flex flex-col sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
        role="dialog"
        aria-modal
        aria-labelledby="add-play-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-xl rounded-b-none border border-slate-700 bg-slate-900 sm:h-auto sm:max-h-[85vh] sm:rounded-xl">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="min-w-0">
              <h2
                id="add-play-drawer-title"
                className="font-display text-base font-bold uppercase tracking-wider text-slate-100"
              >
                Add call
              </h2>
              <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 mt-0.5 truncate">{scenarioDisplayLabel(scenarioName)}</p>
            </div>
            <button
              type="button"
              data-no-press
              className="shrink-0 p-2 -mr-2 text-slate-400 hover:text-white"
              onClick={() => {
                onClose();
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-950">
            <PlayBrowser
              playbook={cfb26Playbook}
              onClose={onClose}
              showTopLevelBack={false}
              excludePlaySheetSpecialTeams
              onSelect={(play) => {
                void onPick(play.formation, normalizePlayName(play.play_name));
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
