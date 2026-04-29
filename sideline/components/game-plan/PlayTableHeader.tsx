"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

export function PlayTableHeader() {
  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-slate-700 px-4 py-2">
      <div className="w-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">Play</div>
      <div className="hidden w-36 shrink-0 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500 sm:block">
        Formation
      </div>
      <div className="flex w-16 shrink-0 justify-center font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
        Type
      </div>
      <div className="w-8 shrink-0" aria-label="Remove" />
    </div>
  );
}
