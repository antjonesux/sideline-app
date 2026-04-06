import type { Scheme } from "@/lib/types";
import Link from "next/link";

const tempoTone: Record<string, string> = {
  "Up-Tempo": "border-[var(--accent)] text-[var(--accent)]",
  Controlled: "text-[var(--chalk-muted)] border-white/20",
  "Ball Control": "text-[var(--amber)] border-[var(--amber)]/40",
};

export function SchemeCard({ scheme }: { scheme: Scheme }) {
  const tone =
    (scheme.tempo && tempoTone[scheme.tempo]) ??
    "text-[var(--chalk-muted)] border-white/20";

  return (
    <Link
      href={`/scheme/${scheme.id}`}
      className="group block rounded-lg border border-white/10 bg-[var(--surface)] p-5 shadow-sm transition-colors hover:border-[var(--accent)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl tracking-wide text-[var(--chalk)] group-hover:text-white md:text-3xl">
          {scheme.name}
        </h2>
        {scheme.tempo ? (
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
          >
            {scheme.tempo}
          </span>
        ) : null}
      </div>
      {scheme.coach_name ? (
        <p className="mt-1 font-mono text-xs text-[var(--chalk-muted)]">
          Based on {scheme.coach_name}
        </p>
      ) : null}
      {scheme.description ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--chalk-soft)]">
          {scheme.description}
        </p>
      ) : null}
      {scheme.cfb26_playbook ? (
        <p className="mt-4 border-t border-white/10 pt-3 font-mono text-xs text-[var(--accent-soft)]">
          <span className="text-[var(--chalk-muted)]">CFB26 playbook · </span>
          {scheme.cfb26_playbook}
        </p>
      ) : null}
    </Link>
  );
}
