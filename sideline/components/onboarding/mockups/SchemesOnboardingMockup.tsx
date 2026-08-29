import { ChevronDown, Star } from "lucide-react";

/** Scheme detail snapshot — title, side toggle, sheet card, Coach View accordion. */
export function SchemesOnboardingMockup() {
  return (
    <div className="w-full max-w-[420px] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-heading text-[14px] font-bold uppercase tracking-[0.08em] text-white">
          Week 7 Identity
        </p>
        <span className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 font-body text-[10px] text-slate-300">
          Edit scheme
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-sans text-[9px] uppercase tracking-widest text-slate-500">Side of ball</p>
        <div className="grid grid-cols-2 gap-2">
          <span className="rounded-lg border border-emerald-500 bg-emerald-500/15 px-2 py-2 text-center font-body text-[11px] font-semibold text-emerald-300">
            Offense
          </span>
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center font-body text-[11px] font-semibold text-slate-400">
            Defense
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-sans text-[12px] font-semibold text-white">Spread Attack</p>
          <span className="shrink-0 font-body text-[10px] text-slate-400">Edit sheet</span>
        </div>
        <p className="mt-0.5 truncate font-body text-[10px] text-slate-500">
          CFB 27 <span className="text-slate-600">/</span> Offense{" "}
          <span className="text-slate-600">/</span> Ohio State
        </p>
      </div>

      <section className="overflow-hidden rounded-xl">
        <div className="flex min-h-10 w-full items-center justify-between gap-2 rounded-t-xl bg-amber-400/10 px-3 py-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <Star className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <span className="truncate font-heading text-[12px] font-bold uppercase tracking-wide text-amber-400">
              Go-To Plays
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="font-body text-[10px] text-amber-400 opacity-80">3 plays</span>
            <ChevronDown className="h-3.5 w-3.5 rotate-180 text-amber-400 opacity-80" aria-hidden />
          </span>
        </div>
        <div className="rounded-b-xl bg-slate-900 px-3 py-2">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-x-3">
            <p className="min-w-0 truncate font-body text-[11px] text-slate-400">Gun Trips</p>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-body text-[11px] uppercase tracking-wide text-white">Mesh</p>
              <p className="truncate font-body text-[11px] uppercase tracking-wide text-white">Slot Fade</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
