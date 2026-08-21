import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";
import { AppCompactWordmark } from "@/components/shared/AppCompactWordmark";
import {
  ADD_PLAY_SITUATION_MOCK,
  BUILDER_SITUATION_GRID_MOCK,
  MarketingSituationGrid,
  type SituationCardMock,
} from "@/components/marketing/MarketingCallSheetIllustrations";
import {
  BUILDER_ADD_PLAY,
  BUILDER_ADD_SITUATION,
  BUILDER_BROWSE_PLAYBOOK,
  CALL_SHEET_MENU_LABEL,
  APP_SHELL_SCHEMES_MENU_LABEL,
  CALL_SHEET_VIEWER_MENU_REVIEW,
  CALL_SHEET_VIEWER_MENU_REVIEW_SOON,
  CALL_SHEET_VIEWER_MENU_SETTINGS,
  CALL_SHEET_VIEWER_TAB_FULL,
  CALL_SHEET_VIEWER_TAB_NEEDS,
} from "@/lib/coachCopy";
import {
  appShellBuilderBrowseButtonClass,
  appShellBuilderTitleClass,
  appShellFieldLabelClass,
} from "@/lib/constants/designTokens";
import { CALL_SHEET_VIEWER_SCENARIO_HELP, getSituationColor } from "@/lib/constants";
import { callSheetScenarioDisplayName, callSheetScenarioPlayCountLabel } from "@/lib/playbookUtils";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronLeft, ClipboardList, Layers, LogOut, Plus, Settings, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const DASHBOARD_SITUATIONS: SituationCardMock[] = BUILDER_SITUATION_GRID_MOCK.slice(0, 4);
const ACTIVE_SHEET = "Week 7 — vs Alabama";
const SHEET_PLAYBOOK = "Spread Offense";

const WORKSPACE_NAV: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  comingSoon?: boolean;
}[] = [
  { label: CALL_SHEET_MENU_LABEL, icon: ClipboardList, active: true },
  { label: APP_SHELL_SCHEMES_MENU_LABEL, icon: Layers, active: false },
  {
    label: CALL_SHEET_VIEWER_MENU_REVIEW,
    icon: Video,
    active: false,
    comingSoon: true,
  },
  { label: CALL_SHEET_VIEWER_MENU_SETTINGS, icon: Settings, active: false },
];

function NavActiveDot() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />;
}

function MarketingWorkspaceSidebar() {
  const navItemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-xs font-medium";

  return (
    <aside
      className="hidden w-[13.5rem] shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex"
      aria-label="Application navigation"
    >
      <div className="shrink-0 px-3 pb-2 pt-3">
        <AppCompactWordmark className="text-sm leading-none sm:text-sm" />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-2.5 py-1.5">
        {WORKSPACE_NAV.map((item) => (
          <div
            key={item.label}
            className={cn(
              navItemClass,
              item.active ? "bg-emerald-950/30 text-white" : item.comingSoon ? "text-slate-600" : "text-slate-400",
            )}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
            {item.active ? <NavActiveDot /> : null}
            {item.comingSoon ? (
              <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 font-sans text-[10px] font-medium leading-none text-slate-500">
                {CALL_SHEET_VIEWER_MENU_REVIEW_SOON}
              </span>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800/80 px-2.5 py-2.5">
        <div className={cn(navItemClass, "text-slate-400")}>
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="flex-1 truncate text-left">Sign out</span>
        </div>
      </div>
    </aside>
  );
}

function MarketingWorkspaceTabBar() {
  return (
    <div
      className="inline-grid w-auto shrink-0 grid-cols-2 gap-1 rounded-xl border border-slate-700 p-1"
      role="tablist"
      aria-label="Call sheet views"
    >
      <div
        role="tab"
        aria-selected
        className="rounded-xl bg-emerald-600 px-3 py-2 font-sans text-xs font-medium text-white"
      >
        {CALL_SHEET_VIEWER_TAB_NEEDS}
      </div>
      <div role="tab" aria-selected={false} className="rounded-xl px-3 py-2 font-sans text-xs font-medium text-slate-500">
        {CALL_SHEET_VIEWER_TAB_FULL}
      </div>
    </div>
  );
}

function MarketingWorkspaceSituationDetail() {
  const situation = ADD_PLAY_SITUATION_MOCK;
  const colors = getSituationColor(situation.colorKey);
  const displayName = callSheetScenarioDisplayName(situation.scenario);
  const helper =
    CALL_SHEET_VIEWER_SCENARIO_HELP[situation.scenario as keyof typeof CALL_SHEET_VIEWER_SCENARIO_HELP] ?? "";
  const countLabel = callSheetScenarioPlayCountLabel(situation.filled);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-slate-800/80 bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-400"
            aria-hidden
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </div>
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", colors.bg)} aria-hidden>
            <SituationIconBadge
              icon={situation.icon}
              colorKey={situation.colorKey}
              name={situation.scenario}
              size="sm"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-sans text-sm font-bold uppercase tracking-[0.06em] text-white">{displayName}</p>
            {helper ? <p className="mt-0.5 truncate font-body text-[10px] text-slate-500">{helper}</p> : null}
          </div>
        </div>
        <p className="shrink-0 font-body text-[10px] text-slate-400">{countLabel}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2.5">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
          <div className="flex min-h-7 items-center gap-2 border-b border-slate-700 px-3 py-1.5">
            <div className="w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 font-mono text-[8px] font-semibold uppercase tracking-widest text-slate-500">
              Play
            </div>
            <div className="flex w-10 shrink-0 justify-center font-mono text-[8px] font-semibold uppercase tracking-widest text-slate-500">
              Type
            </div>
            <div className="w-5 shrink-0" aria-hidden />
          </div>
          {situation.plays.map((play) => (
            <div
              key={play.play_name}
              className="flex min-h-8 items-center gap-2 border-b border-slate-700/50 px-3 py-1.5 last:border-b-0"
            >
              <div className="w-4 shrink-0 text-slate-600" aria-hidden>
                <svg className="mx-auto h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[10px] font-semibold text-slate-100">{play.play_name}</p>
                <p className="mt-0.5 truncate font-body text-[8px] text-slate-500">{play.formation}</p>
              </div>
              <div className="flex w-10 shrink-0 justify-center">
                <PlayTypeBadge type={play.play_type} />
              </div>
              <div className="w-5 shrink-0" aria-hidden />
            </div>
          ))}
          <div className="px-3 py-2">
            <div className="flex min-h-7 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-700 font-sans text-[10px] text-slate-400">
              {BUILDER_ADD_PLAY}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Production desktop workspace — sidebar, dashboard grid, and situation detail (marketing composite). */
export function MarketingWorkspaceIllustration() {
  return (
    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/20">
      <div className="flex min-h-[26rem] lg:min-h-[28rem]">
        <MarketingWorkspaceSidebar />

        <div className="flex min-w-0 flex-1 flex-col bg-slate-950">
          <div className="border-b border-slate-800/80 px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className={cn(appShellBuilderTitleClass, "truncate text-lg md:text-xl")}>{ACTIVE_SHEET}</h3>
                <p className="mt-0.5 font-body text-xs text-slate-400">Built from {SHEET_PLAYBOOK} playbook</p>
              </div>

              <div
                className={cn(
                  appShellBuilderBrowseButtonClass,
                  "inline-flex shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                )}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {BUILDER_BROWSE_PLAYBOOK}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <MarketingWorkspaceTabBar />
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 font-sans text-xs font-medium text-emerald-400">
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {BUILDER_ADD_SITUATION}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row md:gap-4 md:p-4">
            <div className="flex min-w-0 flex-1 flex-col md:max-w-[48%]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className={cn(appShellFieldLabelClass, "text-[10px] font-medium tracking-[0.15em]")}>
                  My Situations
                </p>
                <span className="font-sans text-[10px] font-medium text-slate-500">Edit</span>
              </div>
              <MarketingSituationGrid situations={DASHBOARD_SITUATIONS} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1">
              <MarketingWorkspaceSituationDetail />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
