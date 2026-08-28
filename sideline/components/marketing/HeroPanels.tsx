import { BookOpen, Search } from "lucide-react";
import {
  COACH_VIEW_SECTIONS_MOCK,
  HERO_SITUATION_GRID_MOCK,
  marketingPanelHeaderClass,
  marketingSheetTitleClass,
  MarketingCoachViewAccordions,
  MarketingSituationGrid,
} from "@/components/marketing/MarketingCallSheetIllustrations";

function PanelCard({
  children,
  className = "",
  width,
}: {
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900 ${className}`}
      style={width ? { width } : undefined}
    >
      {children}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">{children}</div>;
}

export function CallSheetPanel({ className = "" }: { className?: string }) {
  return (
    <PanelCard className={className} width={280}>
      <PanelHeader>
        <div>
          <div className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-500">
            Call Sheet
          </div>
          <div className={marketingSheetTitleClass}>
            Week 7 — vs Alabama
          </div>
        </div>
      </PanelHeader>
      <MarketingCoachViewAccordions sections={COACH_VIEW_SECTIONS_MOCK} />
    </PanelCard>
  );
}

export function PlaybookPanel({ className = "" }: { className?: string }) {
  const plays = ["Slot Fade", "Y Cross", "Mesh", "4 Verts", "FB Dive", "Waggle", "PA Post", "Quick Out"];

  return (
    <PanelCard className={className} width={220}>
      <PanelHeader>
        <div className="flex items-center gap-2 px-0 py-0">
          <BookOpen size={11} className="text-slate-400" aria-hidden />
          <span className={marketingPanelHeaderClass}>
            Browse Playbook
          </span>
          <span className="ml-auto font-mono text-[10px] text-slate-500">124 plays</span>
        </div>
      </PanelHeader>
      <div className="p-3">
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.04] px-2.5 py-1.5">
          <Search size={10} className="text-slate-500" aria-hidden />
          <span className="font-mono text-[11px] text-slate-500">Search plays...</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {plays.map((play, i) => (
            <div
              key={play}
              className={`truncate rounded-md px-2 py-1.5 font-mono text-[10px] ${
                i === 2
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  : "border border-transparent bg-white/[0.04] text-slate-400"
              }`}
            >
              {play}
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

export function SituationPanel({ className = "" }: { className?: string }) {
  return (
    <PanelCard className={className} width={212}>
      <PanelHeader>
        <p className={marketingPanelHeaderClass}>Situations</p>
      </PanelHeader>
      <MarketingSituationGrid situations={HERO_SITUATION_GRID_MOCK} />
    </PanelCard>
  );
}

export function TendenciesPanel({ className = "" }: { className?: string }) {
  return (
    <PanelCard className={className} width={200}>
      <PanelHeader>
        <p className={marketingPanelHeaderClass}>Tendencies</p>
      </PanelHeader>
      <div className="p-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Win Rate</p>
          <p className="mt-0.5 font-heading text-2xl font-bold text-emerald-500">71%</p>
        </div>
        <div className="mt-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-slate-500">Top Play</p>
          <p className="mt-1 truncate font-sans text-[10px] font-semibold text-white">PA BOOT OVER</p>
          <p className="truncate font-body text-[9px] text-slate-500">Gun Doubles Offset</p>
          <p className="mt-1 font-mono text-[9px] text-slate-500">
            <span className="text-slate-600">AVG </span>
            <span className="text-emerald-400/90">11.2</span>
          </p>
        </div>
      </div>
    </PanelCard>
  );
}
