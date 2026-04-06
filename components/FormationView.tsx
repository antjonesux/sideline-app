"use client";

import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { useMemo } from "react";

export function FormationView({ rows }: { rows: DraftPlayRow[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, DraftPlayRow[]>();
    for (const r of rows) {
      if (!m.has(r.formation)) m.set(r.formation, []);
      m.get(r.formation)!.push(r);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="space-y-6">
      {groups.map(([formation, list]) => (
        <section key={formation} className="rounded-lg border border-white/10 bg-black/20">
          <h3 className="border-b border-white/10 px-3 py-2 font-mono text-sm text-[var(--accent-soft)]">
            {formation}
          </h3>
          <ul className="divide-y divide-white/5">
            {list
              .sort(
                (a, b) =>
                  (a.situation_order ?? 0) - (b.situation_order ?? 0) ||
                  (a.play_order ?? 0) - (b.play_order ?? 0),
              )
              .map((r) => (
                <li
                  key={r.clientKey}
                  className={`px-3 py-3 ${
                    r.is_used ? "opacity-45" : ""
                  } ${r.is_featured ? "bg-[var(--amber)]/5" : ""}`}
                >
                  <p
                    className={`font-display text-lg text-[var(--chalk)] ${
                      r.is_featured ? "font-bold" : ""
                    }`}
                  >
                    {r.play_name}
                  </p>
                  <p className="font-mono text-xs text-[var(--chalk-muted)]">
                    ({r.situation}
                    {r.play_order != null && r.play_order > 0 ? " · Alt" : ""})
                  </p>
                  {r.counter_play ? (
                    <p className="mt-1 font-mono text-[11px] italic text-[var(--chalk-muted)]">
                      Counter: {r.counter_play}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
