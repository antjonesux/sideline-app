import type { AdjustedSituationalCall } from "@/lib/gamePlanTypes";

export function AdjustedCallSheet({
  calls,
  defensiveSchemeName,
}: {
  calls: AdjustedSituationalCall[];
  defensiveSchemeName: string;
}) {
  const sorted = [...calls].sort((a, b) => a.priority - b.priority);

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface)]">
      <header className="border-b border-white/10 px-4 py-4 md:px-6 md:py-5">
        <h2 className="font-display text-2xl tracking-wide text-[var(--chalk)] md:text-3xl">
          Adjusted Situational Call Sheet
        </h2>
        <p className="mt-2 max-w-2xl font-mono text-xs text-[var(--chalk-muted)]">
          Calls tuned to attack {defensiveSchemeName}: formation, concept, and
          why it wins against this structure.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left font-mono text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              <th className="px-4 py-3 md:px-6">Situation</th>
              <th className="px-4 py-3 md:px-6">Formation</th>
              <th className="px-4 py-3 md:px-6">Play type</th>
              <th className="px-4 py-3 md:px-6">Why vs this defense</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/5 align-top text-[var(--chalk-soft)] last:border-0"
              >
                <td className="px-4 py-4 font-display text-base tracking-wide text-[var(--chalk)] md:px-6">
                  {row.situation}
                </td>
                <td className="px-4 py-4 text-[var(--chalk)] md:px-6">
                  {row.formation}
                </td>
                <td className="px-4 py-4 text-[var(--amber-soft)] md:px-6">
                  {row.play_type}
                </td>
                <td className="px-4 py-4 leading-relaxed md:px-6">
                  {row.rationale}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
