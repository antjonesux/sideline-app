"use client";

type PostTdAttemptSelectorProps = {
  busy?: boolean;
  onSelectXp: () => void;
  onSelectTwoPoint: () => void;
};

/** Inline XP / 2PT chooser shown after an offensive TD is logged. */
export function PostTdAttemptSelector({ busy = false, onSelectXp, onSelectTwoPoint }: PostTdAttemptSelectorProps) {
  return (
    <div className="mx-4 mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-4">
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-amber-400">Touchdown</p>
      <p className="mb-3 font-sans text-sm text-slate-200">Log the extra point or two-point attempt.</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onSelectXp}
          className="min-h-11 rounded-lg border border-emerald-600/60 bg-emerald-950/40 px-4 py-3 font-sans text-sm font-semibold text-emerald-200 transition-colors hover:border-emerald-500 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          XP
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSelectTwoPoint}
          className="min-h-11 rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 font-sans text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          2PT
        </button>
      </div>
    </div>
  );
}
