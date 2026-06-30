"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useCallback, useState } from "react";
import { PlayBrowser, stripFormationGroupPrefix, type PlaySheetAddNav } from "@/components/film/PlayBrowser";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { BUILDER_ADD_PLAY, BUILDER_ADD_PLAY_FOR_SITUATION } from "@/lib/coachCopy";
import { callSheetScenarioDisplayName } from "@/lib/playbookUtils";
import { overlayZ } from "@/lib/constants/designTokens";
import { useScrollLock } from "@/lib/useScrollLock";
import { cn, normalizePlayName } from "@/lib/utils";

type AddPlayDrawerProps = {
  open: boolean;
  onClose: () => void;
  cfb26Playbook: string;
  scenarioName?: string;
  onPick: (formation: string, playName: string) => void | Promise<void>;
  /** When false, drawer stays open after pick (browse-playbook flow). */
  closeOnPick?: boolean;
  showGoToStar?: boolean;
  goToPlayKeys?: Set<string>;
  goToBusyComboKey?: string | null;
  onToggleGoTo?: (formation: string, playName: string) => void;
  addedPlayKeys?: Set<string>;
  addDisabled?: boolean;
  /** Local QA only: skip catalog fetch in embedded PlayBrowser. */
  qaStaticEntries?: import("@/lib/playbook").PlaybookEntry[];
  qaInitialUi?: { step: "formations" | "plays"; formation?: { group: string; name: string } };
  /** `panel` embeds browse UI in the situation side rail without modal chrome. */
  shell?: "modal" | "panel";
};

export function AddPlayDrawer({
  open,
  onClose,
  cfb26Playbook,
  scenarioName = "",
  onPick,
  closeOnPick = false,
  showGoToStar = false,
  goToPlayKeys,
  goToBusyComboKey = null,
  onToggleGoTo,
  addedPlayKeys,
  addDisabled = false,
  qaStaticEntries,
  qaInitialUi,
  shell = "modal",
}: AddPlayDrawerProps) {
  const [nav, setNav] = useState<PlaySheetAddNav>(() => {
    const initialStep = qaInitialUi?.step ?? "formations";
    const formation = qaInitialUi?.formation;
    return {
      step: initialStep,
      formationLabel:
        initialStep === "plays" && formation
          ? stripFormationGroupPrefix(formation.name, formation.group)
          : undefined,
      onBack: () => {},
    };
  });

  const handleNavChange = useCallback((next: PlaySheetAddNav) => {
    setNav(next);
  }, []);

  useScrollLock(open && shell === "modal");

  if (!open) return null;

  const headerTitle =
    nav.step === "plays" && nav.formationLabel
      ? nav.formationLabel.toUpperCase()
      : scenarioName.trim()
        ? BUILDER_ADD_PLAY_FOR_SITUATION(callSheetScenarioDisplayName(scenarioName))
        : BUILDER_ADD_PLAY;
  const headerBackLabel = nav.step === "plays" ? "Back to formations" : "Back";

  const handleHeaderBack = () => {
    if (nav.step === "plays") {
      nav.onBack();
      return;
    }
    onClose();
  };

  const browser = (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        shell === "modal" && "relative z-[1]",
      )}
    >
      <PlayBrowser
        playbook={cfb26Playbook}
        presentation="inline"
        playSheetAddLayout
        showGoToStar={showGoToStar}
        goToPlayKeys={goToPlayKeys}
        goToBusyComboKey={goToBusyComboKey}
        addedPlayKeys={addedPlayKeys}
        addDisabled={addDisabled}
        onToggleGoTo={
          onToggleGoTo
            ? (play) => {
                void onToggleGoTo(play.formation, normalizePlayName(play.play_name));
              }
            : undefined
        }
        onClose={onClose}
        showTopLevelBack={false}
        excludePlaySheetSpecialTeams
        qaStaticEntries={qaStaticEntries}
        qaInitialUi={qaInitialUi}
        onSelect={(play) => {
          void (async () => {
            try {
              await onPick(play.formation, normalizePlayName(play.play_name));
              if (closeOnPick) onClose();
            } catch {
              // Parent surfaces toasts for add failures.
            }
          })();
        }}
        onPlaySheetNavChange={handleNavChange}
      />
    </div>
  );

  if (shell === "panel") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {nav.step === "plays" ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-800/80 px-4 py-2.5">
            <IconBackButton
              data-no-press
              aria-label={headerBackLabel}
              onClick={() => {
                handleHeaderBack();
              }}
            />
            <h2 className="truncate font-display text-xs font-bold uppercase tracking-wide text-slate-300">
              {headerTitle}
            </h2>
          </div>
        ) : null}
        {browser}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn("fixed inset-0 bg-black/60", overlayZ.filmBackdrop)}
        aria-hidden
        onClick={() => {
          onClose();
        }}
      />
      <div
        className={cn(
          "fixed inset-0 flex flex-col sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4",
          overlayZ.filmShell,
        )}
        role="dialog"
        aria-modal
        aria-labelledby="add-play-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-xl rounded-b-none border border-slate-700 bg-slate-950 sm:h-auto sm:max-h-[85vh] sm:rounded-xl">
          <div className="flex shrink-0 items-center gap-3 px-4 py-3">
            <IconBackButton
              data-no-press
              aria-label={headerBackLabel}
              onClick={() => {
                handleHeaderBack();
              }}
            />
            <h2 id="add-play-drawer-title" className="font-display text-base font-bold uppercase text-white">
              {headerTitle}
            </h2>
          </div>
          {browser}
        </div>
      </div>
    </>
  );
}
