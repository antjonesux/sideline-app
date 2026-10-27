"use client";

import { maxSlotsForSheetScenario, scenarioChipLabel } from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const BLEED_OUTER =
  "shrink-0 ms-[calc(50%-50vw)] me-[calc(50%-50vw)] w-screen max-w-[100vw]";
const SCROLL_ROW =
  "overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] flex gap-2 pb-2 [&::-webkit-scrollbar]:hidden";
/** Tracks `--app-shell-max-width` + `--app-shell-px` from `globals.css`. */
const SPACER =
  "shrink-0 w-[calc((100vw-min(100vw,var(--app-shell-max-width)))/2+var(--app-shell-px)-theme(spacing.2))]";

export type PlaySheetChipItem = {
  id: string;
  label: string;
};

type SharedChipScrollProps = {
  /** Film My Sheet: `tab` / `tablist` roles inside Radix `Tabs`. */
  tabSemantics?: boolean;
  /** Play Sheet: strip hidden at `lg+` when the desktop sidebar lists situations. */
  hideFromLg?: boolean;
  /**
   * Full-bleed horizontal scroll (default). Set `false` inside modals/drawers so chips
   * stay within the overlay padding instead of breaking out to the viewport.
   */
  edgeToEdge?: boolean;
};

type SituationModeProps = SharedChipScrollProps & {
  scenarios: SheetScenarioBlock[];
  selectedScenario: string;
  onSelect: (scenario: string) => void;
  /** Film My Sheet keeps legacy slot rules; Builder passes call-sheet-aware resolver. */
  maxSlotsForScenario?: (scenario: string) => number;
  /** Generic chip mode — omit when using situation chips. */
  items?: undefined;
  selectedItemId?: undefined;
  onSelectItem?: undefined;
  navAriaLabel?: undefined;
};

type GenericChipModeProps = SharedChipScrollProps & {
  /** Generic chips (e.g. play setups). When set, situation props are unused. */
  items: PlaySheetChipItem[];
  selectedItemId: string;
  onSelectItem: (id: string) => void;
  navAriaLabel?: string;
  scenarios?: undefined;
  selectedScenario?: undefined;
  onSelect?: undefined;
  maxSlotsForScenario?: undefined;
};

export type PlaySheetSituationChipScrollProps = SituationModeProps | GenericChipModeProps;

function ChipScrollShell({
  hideFromLg,
  tabSemantics,
  ariaLabel,
  edgeToEdge,
  children,
}: {
  hideFromLg: boolean;
  tabSemantics: boolean;
  ariaLabel: string;
  edgeToEdge: boolean;
  children: ReactNode;
}) {
  const row = tabSemantics ? (
    <div className={SCROLL_ROW} role="tablist" aria-label={ariaLabel}>
      {edgeToEdge ? <span aria-hidden className={SPACER} /> : null}
      {children}
      {edgeToEdge ? <span aria-hidden className={SPACER} /> : null}
    </div>
  ) : (
    <nav className={SCROLL_ROW} aria-label={ariaLabel}>
      {edgeToEdge ? <span aria-hidden className={SPACER} /> : null}
      {children}
      {edgeToEdge ? <span aria-hidden className={SPACER} /> : null}
    </nav>
  );

  if (!edgeToEdge) {
    return <div className={cn(hideFromLg && "lg:hidden")}>{row}</div>;
  }

  return <div className={cn(BLEED_OUTER, hideFromLg && "lg:hidden")}>{row}</div>;
}

function chipButtonClass(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-xs ${
    active ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
  }`;
}

export function PlaySheetSituationChipScroll(props: PlaySheetSituationChipScrollProps) {
  const tabSemantics = props.tabSemantics ?? false;
  const hideFromLg = props.hideFromLg ?? false;
  const edgeToEdge = props.edgeToEdge ?? true;

  if (props.items) {
    if (props.items.length === 0) return null;
    return (
      <ChipScrollShell
        hideFromLg={hideFromLg}
        tabSemantics={tabSemantics}
        ariaLabel={props.navAriaLabel ?? "Setups"}
        edgeToEdge={edgeToEdge}
      >
        {props.items.map((item) => {
          const active = item.id === props.selectedItemId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectItem(item.id)}
              {...(tabSemantics ? { role: "tab" as const, "aria-selected": active } : {})}
              className={chipButtonClass(active)}
            >
              {item.label}
            </button>
          );
        })}
      </ChipScrollShell>
    );
  }

  const { scenarios, selectedScenario, onSelect } = props;
  const maxSlotsForScenario = props.maxSlotsForScenario ?? maxSlotsForSheetScenario;
  if (scenarios.length === 0) return null;

  return (
    <ChipScrollShell
      hideFromLg={hideFromLg}
      tabSemantics={tabSemantics}
      ariaLabel={tabSemantics ? "Play sheet situations" : "Situations"}
      edgeToEdge={edgeToEdge}
    >
      {scenarios.map((s) => {
        const max = maxSlotsForScenario(s.scenario);
        const n = s.plays.length;
        const short = scenarioChipLabel(s.scenario);
        const active = s.scenario === selectedScenario;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.scenario)}
            {...(tabSemantics ? { role: "tab" as const, "aria-selected": active } : {})}
            className={chipButtonClass(active)}
          >
            {short} {n}/{max}
          </button>
        );
      })}
    </ChipScrollShell>
  );
}
