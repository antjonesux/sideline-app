"use client";

const ROWS = [
  ["COVER 0", "COVER 1", "COVER 2"],
  ["COVER 3", "COVER 4", "COVER 6"],
  ["BLITZING", "ZONE", "MAN", "MIX"],
  ["BRACKET MY WR1", "SOFT COVERAGE", "ROBBER", "ZERO COVERAGE"],
] as const;

export function CoverageQuickTagDrawer({
  open,
  activeTags,
  onClose,
  onToggleTag,
  quickNote,
  onQuickNote,
  onSubmitNote,
}: {
  open: boolean;
  activeTags: string[];
  onClose: () => void;
  onToggleTag: (tag: string) => void;
  quickNote: string;
  onQuickNote: (s: string) => void;
  onSubmitNote: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70">
      <button
        type="button"
        className="min-h-[15vh] w-full"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="max-h-[88vh] overflow-y-auto rounded-t-2xl border border-white/15 bg-[#0a0a0a] px-4 pb-8 pt-4">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--chalk-muted)]">
          What are they showing?
        </p>
        <div className="mt-4 space-y-3">
          {ROWS.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              {row.map((tag) => {
                const on = activeTags.some(
                  (t) => t.toUpperCase() === tag.toUpperCase(),
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    className={`rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wide transition ${
                      on
                        ? "border-[var(--amber)] bg-[var(--amber)]/20 text-[var(--chalk)]"
                        : "border-white/20 bg-black/40 text-[var(--chalk-muted)] hover:border-white/35"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Note this play…
          </label>
          <input
            value={quickNote}
            maxLength={60}
            onChange={(e) => onQuickNote(e.target.value)}
            placeholder="Quick observation"
            className="mt-2 w-full rounded border border-white/15 bg-black/50 px-3 py-2 font-mono text-sm text-[var(--chalk)] placeholder:text-[var(--chalk-muted)]"
          />
          <button
            type="button"
            disabled={!quickNote.trim()}
            onClick={() => {
              onSubmitNote();
            }}
            className="mt-3 rounded border border-[var(--accent)]/50 px-4 py-2 font-mono text-xs text-[var(--accent-soft)] disabled:opacity-40"
          >
            Log note
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded border border-white/15 py-2 font-mono text-xs text-[var(--chalk-muted)]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
