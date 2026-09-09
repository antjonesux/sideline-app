"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useCallback, useEffect, useState } from "react";
import { PlayBrowser, stripFormationGroupPrefix, type PlaySheetAddNav } from "@/components/film/PlayBrowser";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { BUILDER_ADD_PLAY, BUILDER_ADD_PLAY_FOR_SITUATION } from "@/lib/coachCopy";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import {
  appShellNavItemActiveTextClass,
} from "@/lib/constants/designTokens";
import { callSheetScenarioDisplayName } from "@/lib/playbookUtils";
import { cn, normalizePlayName } from "@/lib/utils";
import { X } from "lucide-react";

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
  /** Catalog game version for cfb.fan play-art URLs. */
  catalogGameVersion?: CatalogGameVersion;
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
  catalogGameVersion,
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
  const [formationPlayQuery, setFormationPlayQuery] = useState("");

  const handleNavChange = useCallback((next: PlaySheetAddNav) => {
    setNav(next);
  }, []);

  const formationSelected = nav.step === "plays" && Boolean(nav.formationLabel);

  useEffect(() => {
    if (!formationSelected) setFormationPlayQuery("");
  }, [formationSelected, nav.formationLabel]);

  if (!open) return null;

  const headerTitle = formationSelected
    ? nav.formationLabel!
    : scenarioName.trim()
      ? BUILDER_ADD_PLAY_FOR_SITUATION(callSheetScenarioDisplayName(scenarioName))
      : BUILDER_ADD_PLAY;
  const headerBackLabel = nav.step === "plays" ? "Back to formations" : "Back";
  const formationHeadingClass = cn(
    "min-w-0 flex-1 truncate font-body text-sm font-medium normal-case tracking-normal",
    appShellNavItemActiveTextClass,
  );

  const handleHeaderBack = () => {
    if (nav.step === "plays") {
      nav.onBack();
      return;
    }
    onClose();
  };

  const formationSearchField = formationSelected ? (
    <div className="relative min-h-11 w-full">
      <input
        type="text"
        value={formationPlayQuery}
        onChange={(e) => setFormationPlayQuery(e.target.value)}
        placeholder="Search plays"
        aria-label="Search plays in this formation"
        autoComplete="off"
        enterKeyHint="search"
        className={cn(
          "min-h-11 w-full touch-manipulation rounded-xl border border-slate-700 bg-slate-900 py-2 pl-3 font-sans text-sm text-white placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25",
          formationPlayQuery.length > 0 ? "pr-10" : "pr-3",
        )}
      />
      {formationPlayQuery.length > 0 ? (
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Clear search"
          onClick={() => setFormationPlayQuery("")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  ) : null;

  const browser = (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        shell === "panel" ? "w-full" : "min-h-0 flex-1 overflow-hidden",
        shell === "modal" && "relative z-[1]",
      )}
    >
      <PlayBrowser
        playbook={cfb26Playbook}
        presentation="inline"
        playSheetAddLayout
        pageScrollResults={shell === "panel"}
        formationPlayFilter={formationSelected ? formationPlayQuery : undefined}
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
        catalogGameVersion={catalogGameVersion}
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
      <div className="flex w-full flex-col">
        {formationSelected ? (
          <div className="sticky top-0 z-10 space-y-2 border-b border-slate-800/80 bg-slate-950 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <IconBackButton
                data-no-press
                aria-label={headerBackLabel}
                onClick={() => {
                  handleHeaderBack();
                }}
              />
              <h2 className={formationHeadingClass}>{headerTitle}</h2>
            </div>
            {formationSearchField}
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
        <div
          className={cn(
            "shrink-0 space-y-2 px-4 py-3",
            formationSelected && "border-b border-slate-800/80",
          )}
        >
          <div className="flex items-center gap-3">
            <IconBackButton
              data-no-press
              aria-label={headerBackLabel}
              onClick={() => {
                handleHeaderBack();
              }}
            />
            <h2
              id="add-play-drawer-title"
              className={
                formationSelected
                  ? formationHeadingClass
                  : "font-display text-base font-bold uppercase text-white"
              }
            >
              {headerTitle}
            </h2>
          </div>
          {formationSearchField}
        </div>
        {browser}
      </div>
    </ResponsiveOverlay>
  );
}
