import type { SituationalCall } from "@/lib/types";

const highlightSituations = new Set([
  "3rd & Long",
  "Red Zone",
  "2-Minute Drill",
]);

export function SituationalCallCard({ call }: { call: SituationalCall }) {
  const urgent = highlightSituations.has(call.situation);

  return (
    <article
      className={`rounded border border-white/10 bg-black/25 p-4 ${
        urgent ? "border-l-4 border-l-[var(--amber)] pl-3" : "border-l-4 border-l-[var(--accent)] pl-3"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg tracking-wide text-[var(--chalk)]">
          {call.situation}
        </h3>
        {call.down != null ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Down {call.down}
            {call.distance_min != null
              ? ` · ${call.distance_min}${call.distance_max != null && call.distance_max !== call.distance_min ? `–${call.distance_max}` : ""} yds`
              : ""}
          </span>
        ) : null}
      </div>
      <dl className="mt-3 grid gap-2 font-mono text-sm text-[var(--chalk-soft)] sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Formation
          </dt>
          <dd className="text-[var(--chalk)]">{call.formation}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Play type
          </dt>
          <dd className="text-[var(--amber-soft)]">{call.play_type}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-white/10 pt-3 font-mono text-xs leading-relaxed text-[var(--chalk-muted)]">
        <span className="text-[var(--chalk-soft)]">Why · </span>
        {call.rationale}
      </p>
    </article>
  );
}
