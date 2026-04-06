"use client";

import { DEFENSIVE_SCHEME_OPTIONS } from "@/lib/gamePlanTypes";
import { filterTeamsByQuery } from "@/lib/teamSchemes";
import { useGameStore } from "@/store/gameStore";
import { useMemo, useState } from "react";

type Tab = "team" | "scheme";

export function OpponentSelector() {
  const [tab, setTab] = useState<Tab>("team");
  const [query, setQuery] = useState("");

  const selectedDefensiveScheme = useGameStore((s) => s.selectedDefensiveScheme);
  const selectedOpponentTeam = useGameStore((s) => s.selectedOpponentTeam);
  const setOpponentByTeam = useGameStore((s) => s.setOpponentByTeam);
  const setOpponentByScheme = useGameStore((s) => s.setOpponentByScheme);
  const clearOpponent = useGameStore((s) => s.clearOpponent);

  const filteredTeams = useMemo(() => filterTeamsByQuery(query), [query]);

  return (
    <section className="rounded-lg border border-white/10 bg-[var(--surface)]">
      <header className="border-b border-white/10 px-4 py-4 md:px-6 md:py-5">
        <h2 className="font-display text-2xl tracking-wide text-[var(--chalk)] md:text-3xl">
          Opponent
        </h2>
        <p className="mt-2 font-mono text-xs text-[var(--chalk-muted)]">
          Pick a CFB26 team (instant scheme ID) or choose their defensive front
          directly. Both paths feed the same game plan.
        </p>
      </header>

      <div className="flex border-b border-white/10 px-4 font-mono text-xs md:px-6">
        <button
          type="button"
          onClick={() => setTab("team")}
          className={`border-b-2 px-3 py-3 uppercase tracking-wider transition ${
            tab === "team"
              ? "border-[var(--accent)] text-[var(--chalk)]"
              : "border-transparent text-[var(--chalk-muted)] hover:text-[var(--chalk-soft)]"
          }`}
        >
          By team
        </button>
        <button
          type="button"
          onClick={() => setTab("scheme")}
          className={`border-b-2 px-3 py-3 uppercase tracking-wider transition ${
            tab === "scheme"
              ? "border-[var(--accent)] text-[var(--chalk)]"
              : "border-transparent text-[var(--chalk-muted)] hover:text-[var(--chalk-soft)]"
          }`}
        >
          By scheme
        </button>
      </div>

      <div className="p-4 md:p-6">
        {tab === "team" ? (
          <div className="space-y-3">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              Search teams
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter (e.g. Georgia, WSU)…"
              className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--chalk)] placeholder:text-[var(--chalk-muted)] focus:border-[var(--accent)] focus:outline-none"
              autoComplete="off"
            />
            <ul className="max-h-56 overflow-y-auto rounded border border-white/10 bg-black/25 font-mono text-sm">
              {filteredTeams.slice(0, 80).map((t) => (
                <li key={t.team_name}>
                  <button
                    type="button"
                    onClick={() => setOpponentByTeam(t.team_name)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[var(--chalk-soft)] hover:bg-white/5 hover:text-[var(--chalk)]"
                  >
                    <span>{t.team_name}</span>
                    <span className="text-[10px] text-[var(--chalk-muted)]">
                      {t.defensive_scheme}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {filteredTeams.length > 80 ? (
              <p className="font-mono text-[10px] text-[var(--chalk-muted)]">
                Showing first 80 matches — keep typing to narrow results.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEFENSIVE_SCHEME_OPTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setOpponentByScheme(name)}
                className={`rounded border px-3 py-3 text-left font-mono text-xs transition ${
                  selectedDefensiveScheme === name && !selectedOpponentTeam
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--chalk)]"
                    : "border-white/15 bg-black/25 text-[var(--chalk-soft)] hover:border-white/25"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {selectedDefensiveScheme ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              Identified
            </span>
            <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 font-mono text-sm text-[var(--accent-soft)]">
              {selectedOpponentTeam
                ? `${selectedOpponentTeam} → ${selectedDefensiveScheme}`
                : `Scheme: ${selectedDefensiveScheme}`}
            </span>
            <button
              type="button"
              onClick={clearOpponent}
              className="font-mono text-xs text-[var(--chalk-muted)] underline decoration-white/20 underline-offset-4 hover:text-[var(--chalk-soft)]"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
