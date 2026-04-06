import type { SchemeFormation } from "@/lib/types";
import { useMemo } from "react";

/** Stored `formation_group` values → UI labels from product spec */
const FORMATION_GROUP_LABELS: Record<string, string> = {
  "Core Passing": "Core Passing Attack formations",
  "RPO/Run": "RPO / Run Game formations",
  "Red Zone": "Red Zone formations",
  "3rd Down": "3rd Down formations",
};

const GROUP_ORDER = [
  "Core Passing",
  "RPO/Run",
  "Red Zone",
  "3rd Down",
];

function formationGroupHeading(key: string) {
  return FORMATION_GROUP_LABELS[key] ?? key;
}

export function FormationPanel({
  formations,
}: {
  formations: SchemeFormation[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, SchemeFormation[]>();
    for (const f of formations) {
      const g = f.formation_group ?? "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return map;
  }, [formations]);

  const groups = [
    ...GROUP_ORDER.filter((g) => grouped.has(g)),
    ...Array.from(grouped.keys()).filter((g) => !GROUP_ORDER.includes(g)),
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface)]">
      <header className="border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-xl tracking-wide text-[var(--chalk)]">
          Your Formations
        </h2>
        <p className="mt-1 font-mono text-xs text-[var(--chalk-muted)]">
          Core passing attack, RPO/run game, red zone, third down — from your
          CFB26 playbook.
        </p>
      </header>
      <div className="divide-y divide-white/10">
        {groups.map((group) => {
          const items = grouped.get(group) ?? [];
          return (
            <div key={group}>
              <div className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-[var(--accent-soft)]">
                {formationGroupHeading(group)}
                <span className="ml-2 text-[var(--chalk-muted)]">
                  · {items.length}
                </span>
              </div>
              <ul className="grid gap-1 px-4 pb-4">
                {items.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="w-full rounded border border-transparent px-2 py-2 text-left font-mono text-sm text-[var(--chalk)] transition-colors hover:border-[var(--accent)]/40 hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] active:bg-black/40"
                      aria-label={`Formation ${f.formation_name}`}
                    >
                      {f.formation_name}
                      {f.notes ? (
                        <span className="mt-1 block font-mono text-[11px] text-[var(--chalk-muted)]">
                          {f.notes}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
