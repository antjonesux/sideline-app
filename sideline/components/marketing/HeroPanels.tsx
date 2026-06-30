import { BookOpen, CheckCircle, Layers, Plus, Search } from "lucide-react";

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
  return (
    <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">{children}</div>
  );
}

export function CallSheetPanel({ className = "" }: { className?: string }) {
  const sections = [
    {
      label: "Go-To Plays",
      plays: [
        { name: "Slot Fade", formation: "Gun Trey" },
        { name: "Y Cross", formation: "Singleback" },
        { name: "PA Post Wheel", formation: "I-Form" },
      ],
    },
    {
      label: "Red Zone",
      plays: [
        { name: "FB Dive", formation: "I-Form Tight" },
        { name: "Waggle", formation: "Shotgun" },
      ],
    },
    {
      label: "Tempo",
      plays: [{ name: "Mesh", formation: "4 Verts" }],
    },
  ];

  return (
    <PanelCard className={className} width={300}>
      <PanelHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-500">
              Call Sheet
            </div>
            <div className="font-heading text-sm font-semibold normal-case tracking-normal text-slate-100">
              Week 7 — vs Alabama
            </div>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-500">
            Active
          </span>
        </div>
      </PanelHeader>

      <div className="space-y-3 p-3">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.plays.map((play) => (
                <div
                  key={play.name}
                  className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2"
                >
                  <span className="text-xs font-medium text-slate-100">{play.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{play.formation}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-800 px-4 py-2">
        <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-500">
          <Plus size={10} aria-hidden />
          Add play
        </div>
        <div className="ml-auto font-mono text-[10px] text-slate-500">6 plays</div>
      </div>
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
          <span className="font-heading text-xs font-semibold normal-case tracking-normal text-slate-100">
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
  const situations = ["Go-To Plays", "Tempo", "Red Zone", "Man Beaters"];

  return (
    <PanelCard className={className} width={172}>
      <PanelHeader>
        <div className="flex items-center gap-2 px-0 py-0">
          <Layers size={11} className="text-emerald-500" aria-hidden />
          <span className="font-heading text-[11px] font-semibold normal-case tracking-normal text-slate-100">
            Situations
          </span>
        </div>
      </PanelHeader>
      <div className="space-y-1.5 p-3">
        {situations.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 font-heading text-[11px] normal-case tracking-normal ${
              i === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-white/[0.04] text-slate-400"
            }`}
          >
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-500"}`}
            />
            {s}
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

export function PlayManagementChip({ className = "" }: { className?: string }) {
  return (
    <PanelCard className={`p-3 ${className}`} width={148}>
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">Play Added</div>
      <div className="mb-2 font-heading text-sm font-bold normal-case tracking-normal text-white">Slot Fade</div>
      <div className="space-y-1.5">
        {["Go-To Plays", "Man Beaters", "Tempo"].map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-1.5 text-[10px] ${i === 0 ? "text-emerald-500" : "text-slate-400"}`}
          >
            <CheckCircle size={10} className={i === 0 ? "text-emerald-500" : "text-slate-500"} aria-hidden />
            {s}
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-white/5 pt-2 font-mono text-[9px] text-slate-500">Gun Trey · Shotgun</div>
    </PanelCard>
  );
}
