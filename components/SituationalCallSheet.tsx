import type { SituationalCall } from "@/lib/types";
import { SituationalCallCard } from "@/components/SituationalCallCard";

export function SituationalCallSheet({
  calls,
}: {
  calls: SituationalCall[];
}) {
  const sorted = [...calls].sort((a, b) => a.priority - b.priority);

  return (
    <section className="rounded-lg border border-[var(--accent)]/30 bg-[var(--surface)] shadow-[0_0_0_1px_rgba(45,106,79,0.15)]">
      <header className="border-b border-white/10 px-4 py-4 md:px-6 md:py-5">
        <h2 className="font-display text-2xl tracking-wide text-[var(--chalk)] md:text-3xl">
          What To Call & When
        </h2>
        <p className="mt-2 max-w-2xl font-mono text-xs text-[var(--chalk-muted)]">
          Situational sequence: formation, concept family, and the defensive
          problem you are solving.
        </p>
      </header>
      <div className="grid gap-3 p-4 md:grid-cols-2 md:gap-4 md:p-6">
        {sorted.map((call) => (
          <SituationalCallCard key={call.id} call={call} />
        ))}
      </div>
    </section>
  );
}
