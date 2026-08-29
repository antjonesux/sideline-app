import { ChevronDown, Crosshair, Eye, Flag, Shield, Star, Target } from "lucide-react";

type SituationHeader = {
  name: string;
  plays: number;
  text: string;
  bg: string;
  icon: typeof Star;
  expanded?: boolean;
};

const SITUATIONS: SituationHeader[] = [
  { name: "Go-To Plays", plays: 3, text: "text-amber-400", bg: "bg-amber-400/10", icon: Star, expanded: true },
  { name: "Red Zone", plays: 2, text: "text-red-400", bg: "bg-red-400/10", icon: Flag },
  { name: "Run Game", plays: 4, text: "text-emerald-400", bg: "bg-emerald-400/10", icon: Shield },
  { name: "Pass Game", plays: 5, text: "text-blue-400", bg: "bg-blue-400/10", icon: Target },
  { name: "Man Beaters", plays: 3, text: "text-violet-400", bg: "bg-violet-400/10", icon: Crosshair },
  { name: "Zone Beaters", plays: 2, text: "text-rose-400", bg: "bg-rose-400/10", icon: Eye },
];

/** Call Sheet Coach View snapshot — colored situation accordions. */
export function CallSheetsOnboardingMockup() {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-1.5">
      <div className="inline-grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-700 p-1">
        <span className="rounded-lg px-2 py-1 text-center font-body text-[10px] font-medium text-slate-500">
          Situations
        </span>
        <span className="rounded-lg bg-emerald-600 px-2 py-1 text-center font-body text-[10px] font-medium text-white">
          Coach View
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {SITUATIONS.map((s) => {
          const Icon = s.icon;
          const expanded = Boolean(s.expanded);
          return (
            <section key={s.name} className="overflow-hidden rounded-xl">
              <div
                className={`flex min-h-9 w-full items-center justify-between gap-2 px-3 py-1.5 ${s.bg} ${
                  expanded ? "rounded-t-xl" : "rounded-xl"
                }`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${s.text}`} aria-hidden />
                  <span
                    className={`truncate font-heading text-[11px] font-bold uppercase tracking-wide ${s.text}`}
                  >
                    {s.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className={`font-body text-[10px] opacity-80 ${s.text}`}>{s.plays} plays</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 opacity-80 ${s.text} ${expanded ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </span>
              </div>
              {expanded ? (
                <div className="rounded-b-xl bg-slate-900 px-3 py-1.5">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-x-3">
                    <p className="min-w-0 truncate font-body text-[11px] text-slate-400">Gun Trips</p>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-body text-[11px] uppercase tracking-wide text-white">Mesh</p>
                      <p className="truncate font-body text-[11px] uppercase tracking-wide text-white">Slot Fade</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
