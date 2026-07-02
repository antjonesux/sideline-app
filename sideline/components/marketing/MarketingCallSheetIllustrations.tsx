import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";
import type { GamePlanPlayType } from "@/components/game-plan/PlayTableRow";
import { BUILDER_ADD_PLAY } from "@/lib/coachCopy";
import { CALL_SHEET_VIEWER_SCENARIO_HELP, getSituationColor } from "@/lib/constants";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioPlayCountLabel,
} from "@/lib/playbookUtils";
import { cn } from "@/lib/utils";

/** Panel title row — matches hero Browse Playbook / Situations header treatment. */
export const marketingPanelHeaderClass =
  "font-heading text-xs font-semibold normal-case tracking-normal text-slate-100";

/** Sheet subtitle row — matches hero Call Sheet "Week 7 — vs Alabama" treatment. */
export const marketingSheetTitleClass =
  "font-heading text-sm font-semibold normal-case tracking-normal text-slate-100";

export type SituationCardMock = {
  scenario: string;
  colorKey: string;
  icon: string;
  count: number;
};

export type CoachAccordionSectionMock = {
  id: string;
  scenario: string;
  colorKey: string;
  icon: string;
  count: number;
  expanded: boolean;
  formationGroups?: { formation: string; plays: string[] }[];
};

export const HERO_SITUATION_GRID_MOCK: SituationCardMock[] = [
  { scenario: "Go-To Plays", colorKey: "amber", icon: "Star", count: 3 },
  { scenario: "Red Zone", colorKey: "red", icon: "Flag", count: 2 },
  { scenario: "Zone Beaters", colorKey: "teal", icon: "Eye", count: 1 },
  { scenario: "Man Beaters", colorKey: "violet", icon: "Crosshair", count: 0 },
];

export const BUILDER_SITUATION_GRID_MOCK: SituationCardMock[] = [
  { scenario: "Go-To Plays", colorKey: "amber", icon: "Star", count: 3 },
  { scenario: "Tempo", colorKey: "cyan", icon: "FastForward", count: 2 },
  { scenario: "Run Game", colorKey: "emerald", icon: "Shield", count: 4 },
  { scenario: "Pass Game", colorKey: "blue", icon: "Target", count: 5 },
  { scenario: "Man Beaters", colorKey: "violet", icon: "Crosshair", count: 2 },
  { scenario: "Zone Beaters", colorKey: "teal", icon: "Eye", count: 1 },
  { scenario: "Take a Shot", colorKey: "orange", icon: "Rocket", count: 2 },
  { scenario: "Red Zone", colorKey: "red", icon: "Flag", count: 2 },
];

export const COACH_VIEW_SECTIONS_MOCK: CoachAccordionSectionMock[] = [
  {
    id: "go-to",
    scenario: "Go-To Plays",
    colorKey: "amber",
    icon: "Star",
    count: 3,
    expanded: true,
    formationGroups: [
      { formation: "Gun Trey", plays: ["Slot Fade", "Y Cross"] },
      { formation: "Singleback", plays: ["PA Post Wheel"] },
    ],
  },
  {
    id: "red-zone",
    scenario: "Red Zone",
    colorKey: "red",
    icon: "Flag",
    count: 2,
    expanded: false,
  },
  {
    id: "zone-beaters",
    scenario: "Zone Beaters",
    colorKey: "teal",
    icon: "Eye",
    count: 1,
    expanded: false,
  },
];

export type AddPlaySituationMock = {
  scenario: string;
  colorKey: string;
  icon: string;
  filled: number;
  max: number;
  plays: { formation: string; play_name: string; play_type: GamePlanPlayType }[];
};

export const ADD_PLAY_SITUATION_MOCK: AddPlaySituationMock = {
  scenario: "Go-To Plays",
  colorKey: "amber",
  icon: "Star",
  filled: 2,
  max: 3,
  plays: [
    { formation: "Gun Trey", play_name: "Slot Fade", play_type: "PASS" },
    { formation: "Gun Trey", play_name: "Y Cross", play_type: "PASS" },
  ],
};

function MarketingSituationPlayRow({
  formation,
  play_name,
  play_type,
}: {
  formation: string;
  play_name: string;
  play_type: GamePlanPlayType;
}) {
  return (
    <div className="flex min-h-9 items-center gap-2 border-b border-slate-700/50 px-3 py-2 last:border-b-0">
      <div className="w-4 shrink-0 text-slate-600" aria-hidden>
        <svg className="mx-auto h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[11px] font-semibold text-slate-100">{play_name}</p>
        <p className="mt-0.5 truncate font-body text-[9px] text-slate-500">{formation}</p>
      </div>
      <div className="flex w-12 shrink-0 justify-center">
        <PlayTypeBadge type={play_type} />
      </div>
      <div className="flex w-6 shrink-0 justify-center text-slate-500" aria-hidden>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
      </div>
    </div>
  );
}

function AccordionChevron({ className, expanded }: { className?: string; expanded?: boolean }) {
  return (
    <svg
      className={cn(
        "h-3.5 w-3.5 shrink-0 opacity-80 transition-transform motion-reduce:transition-none",
        expanded && "rotate-180",
        className,
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SituationGridCard({ situation }: { situation: SituationCardMock }) {
  const colors = getSituationColor(situation.colorKey);
  const displayName = callSheetScenarioDisplayName(situation.scenario);
  const helper =
    CALL_SHEET_VIEWER_SCENARIO_HELP[situation.scenario as keyof typeof CALL_SHEET_VIEWER_SCENARIO_HELP] ?? "";
  const countLabel = callSheetScenarioPlayCountLabel(situation.count);

  return (
    <div
      className={cn(
        "flex min-h-[4.75rem] min-w-0 w-full flex-col rounded-xl p-2.5 text-start",
        colors.bg,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <SituationIconBadge
          icon={situation.icon}
          colorKey={situation.colorKey}
          name={situation.scenario}
          size="sm"
        />
        <span className={cn("shrink-0 font-body text-[10px] opacity-80", colors.text)}>{countLabel}</span>
      </div>
      <div className="mt-1.5 min-w-0">
        <p className={cn("truncate font-heading text-[10px] font-bold", colors.text)}>{displayName}</p>
        {helper ? (
          <p className={cn("mt-0.5 truncate font-body text-[9px] opacity-75", colors.text)}>{helper}</p>
        ) : null}
      </div>
    </div>
  );
}

function CoachViewAccordionSection({ section }: { section: CoachAccordionSectionMock }) {
  const colors = getSituationColor(section.colorKey);
  const displayName = callSheetScenarioDisplayName(section.scenario);
  const sectionLabel = displayName.toUpperCase();
  const countLabel = callSheetScenarioPlayCountLabel(section.count);

  return (
    <section className="overflow-hidden rounded-xl">
      <div
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2.5",
          colors.bg,
          section.expanded ? "rounded-t-xl" : "rounded-xl",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <SituationIconBadge
            icon={section.icon}
            colorKey={section.colorKey}
            name={section.scenario}
            size="sm"
          />
          <span
            className={cn(
              "min-w-0 truncate font-heading text-[10px] font-bold uppercase tracking-wide",
              colors.text,
            )}
          >
            {sectionLabel}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className={cn("font-body text-[10px] opacity-80", colors.text)}>{countLabel}</span>
          <AccordionChevron className={colors.text} expanded={section.expanded} />
        </span>
      </div>
      {section.expanded && section.formationGroups ? (
        <div className="rounded-b-xl bg-slate-900 px-3 pb-1.5">
          {section.formationGroups.map((group, groupIndex) => (
            <div
              key={group.formation}
              className={cn(
                "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-x-3 border-b border-slate-700/50 py-2",
                groupIndex === section.formationGroups!.length - 1 && "border-b-0",
              )}
            >
              <p className="min-w-0 truncate font-body text-[10px] text-slate-400">{group.formation}</p>
              <div className="min-w-0 flex-1 space-y-1">
                {group.plays.map((play) => (
                  <p
                    key={play}
                    className="truncate font-body text-[10px] uppercase tracking-wide text-white"
                  >
                    {play}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function IllustrationShell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900", className)}>
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <span className={marketingSheetTitleClass}>{label}</span>
      </div>
      {children}
    </div>
  );
}

export function MarketingSituationGrid({ situations }: { situations: SituationCardMock[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2" role="list" aria-label="Custom situations">
      {situations.map((situation) => (
        <div key={situation.scenario} role="listitem">
          <SituationGridCard situation={situation} />
        </div>
      ))}
    </div>
  );
}

export function MarketingCoachViewAccordions({ sections }: { sections: CoachAccordionSectionMock[] }) {
  return (
    <div className="flex flex-col gap-2 p-2.5">
      {sections.map((section) => (
        <CoachViewAccordionSection key={section.id} section={section} />
      ))}
    </div>
  );
}

export function MarketingSituationGridIllustration({
  situations,
  label = "Situations",
  className,
}: {
  situations: SituationCardMock[];
  label?: string;
  className?: string;
}) {
  return (
    <IllustrationShell label={label} className={className}>
      <MarketingSituationGrid situations={situations} />
    </IllustrationShell>
  );
}

export function MarketingCoachViewIllustration({
  sections,
  label = "Coach View",
  sheetTitle = "Week 7 — vs Alabama",
  className,
}: {
  sections: CoachAccordionSectionMock[];
  label?: string;
  sheetTitle?: string;
  className?: string;
}) {
  return (
    <IllustrationShell label={label} className={className}>
      <div className="border-b border-slate-800 px-4 py-2.5">
        <p className={marketingSheetTitleClass}>{sheetTitle}</p>
      </div>
      <MarketingCoachViewAccordions sections={sections} />
    </IllustrationShell>
  );
}

export function MarketingAddPlayIllustration({
  situation = ADD_PLAY_SITUATION_MOCK,
  label = "Call Sheet Builder",
  className,
}: {
  situation?: AddPlaySituationMock;
  label?: string;
  className?: string;
}) {
  const colors = getSituationColor(situation.colorKey);
  const displayName = callSheetScenarioDisplayName(situation.scenario);
  const helper =
    CALL_SHEET_VIEWER_SCENARIO_HELP[situation.scenario as keyof typeof CALL_SHEET_VIEWER_SCENARIO_HELP] ?? "";

  return (
    <IllustrationShell label={label} className={className}>
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className={cn("flex shrink-0 items-center justify-center rounded-lg p-2", colors.bg)} aria-hidden>
              <SituationIconBadge
                icon={situation.icon}
                colorKey={situation.colorKey}
                name={situation.scenario}
                size="sm"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-xs font-bold text-white">{displayName}</p>
              {helper ? <p className="mt-0.5 truncate font-body text-[10px] text-slate-400">{helper}</p> : null}
            </div>
          </div>
          <p className="shrink-0 font-body text-[10px] text-slate-400">
            {situation.filled}/{situation.max}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
          <div className="flex min-h-8 items-center gap-2 border-b border-slate-700 px-3 py-1.5">
            <div className="w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              Play
            </div>
            <div className="flex w-12 shrink-0 justify-center font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              Type
            </div>
            <div className="w-6 shrink-0" aria-hidden />
          </div>
          <div>
            {situation.plays.map((play) => (
              <MarketingSituationPlayRow key={play.play_name} {...play} />
            ))}
            <div className="border-b border-slate-700/50 px-3 py-2">
              <div className="flex min-h-8 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-700 font-sans text-[11px] text-slate-400">
                {BUILDER_ADD_PLAY}
              </div>
            </div>
          </div>
        </div>
      </div>
    </IllustrationShell>
  );
}
