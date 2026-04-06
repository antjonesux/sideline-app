import type { SchemePlayerType } from "@/lib/types";

export function PlayerTypePanel({
  playerTypes,
}: {
  playerTypes: SchemePlayerType[];
}) {
  const ordered = [...playerTypes].sort((a, b) =>
    a.position.localeCompare(b.position),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface)]">
      <header className="border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-xl tracking-wide text-[var(--chalk)]">
          Who Thrives In This Scheme
        </h2>
        <p className="mt-1 font-mono text-xs text-[var(--chalk-muted)]">
          Archetypes and traits to prioritize by position.
        </p>
      </header>
      <ul className="grid gap-3 p-4 sm:grid-cols-2">
        {ordered.map((pt) => (
          <li
            key={pt.id}
            className="rounded border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-[var(--accent-soft)]">
                {pt.position}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm text-[var(--chalk)]">
              {pt.archetype_label}
            </p>
            {pt.key_attributes?.length ? (
              <p className="mt-2 font-mono text-[11px] leading-snug text-[var(--chalk-soft)]">
                <span className="text-[var(--chalk-muted)]">Prioritize · </span>
                {pt.key_attributes.join(" · ")}
              </p>
            ) : null}
            {pt.avoid_note ? (
              <p className="mt-2 border-l-2 border-[var(--amber)]/60 pl-2 font-mono text-[11px] leading-snug text-[var(--chalk-muted)]">
                <span className="text-[var(--chalk-soft)]">What to avoid · </span>
                {pt.avoid_note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
