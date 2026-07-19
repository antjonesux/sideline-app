"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useCallback, useState } from "react";
import { PlayBrowser, stripFormationGroupPrefix, type PlaySheetAddNav } from "@/components/film/PlayBrowser";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { BUILDER_ADD_PLAY, BUILDER_ADD_PLAY_FOR_SITUATION } from "@/lib/coachCopy";
import type { CatalogSideOfBall } from "@/lib/constants";
import { callSheetScenarioDisplayName } from "@/lib/playbookUtils";
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
  /** Pins Goal Line + Hail Mary / Prevent to the bottom of the formation list. */
  catalogSideOfBall?: CatalogSideOfBall;
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
  catalogSideOfBall,
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
        catalogSideOfBall={catalogSideOfBall}
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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {nav.step === "plays" ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-800/80 bg-slate-950 px-4 py-2.5">
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
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      mobileVariant="full-drawer"
      maxWidth="4xl"
      contentClassName="md:max-h-[85vh] md:overflow-hidden"
    >
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:rounded-xl md:border md:border-slate-700 md:bg-slate-950">
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
    </ResponsiveOverlay>
  );
}
