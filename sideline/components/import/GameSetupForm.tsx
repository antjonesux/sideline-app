"use client";

import type { GameSetup } from "@/store/importStore";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialSetup: GameSetup | null;
  onNext: (setup: GameSetup) => void;
};

export function GameSetupForm({ initialSetup, onNext }: Props) {
  const { my_playbook, my_scheme, setLastGame } = useLastGamePrefsStore();

  const [offensive_team, setOffensiveTeam] = useState(initialSetup?.offensive_team ?? my_playbook ?? "");
  const [offensive_scheme, setOffensiveScheme] = useState(initialSetup?.offensive_scheme ?? my_scheme ?? "");
  const [opponent_team, setOpponentTeam] = useState(initialSetup?.opponent_team ?? "");
  const [opponent_defensive_scheme, setOpponentDefense] = useState(initialSetup?.opponent_defensive_scheme ?? "");
  const [final_score, setFinalScore] = useState(initialSetup?.final_score ?? "");
  const [result, setResult] = useState<"W" | "L">(initialSetup?.result ?? "W");

  useEffect(() => {
    if (initialSetup) return;
    if (offensive_team || offensive_scheme) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/games");
      if (!res.ok || cancelled) return;
      const games = (await res.json()) as { my_playbook?: string; my_scheme?: string }[];
      const g = games[0];
      if (!g?.my_playbook) return;
      if (cancelled) return;
      setOffensiveTeam((prev) => prev || g.my_playbook || "");
      setOffensiveScheme((prev) => prev || g.my_scheme || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSetup, offensive_team, offensive_scheme]);

  const canNext = useMemo(() => {
    return (
      offensive_team.trim() &&
      offensive_scheme.trim() &&
      opponent_team.trim() &&
      opponent_defensive_scheme.trim() &&
      final_score.trim()
    );
  }, [offensive_team, offensive_scheme, opponent_team, opponent_defensive_scheme, final_score]);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl tracking-wide text-white">Game Setup</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Your Team</span>
          <input
            className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
            value={offensive_team}
            onChange={(e) => setOffensiveTeam(e.target.value)}
            placeholder="Washington State"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Offensive Scheme</span>
          <input
            className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
            value={offensive_scheme}
            onChange={(e) => setOffensiveScheme(e.target.value)}
            placeholder="Power Spread"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Opponent</span>
          <input
            className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
            value={opponent_team}
            onChange={(e) => setOpponentTeam(e.target.value)}
            placeholder="Oregon"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Opponent Defense</span>
          <input
            className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
            value={opponent_defensive_scheme}
            onChange={(e) => setOpponentDefense(e.target.value)}
            placeholder="3-3-5"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Final Score</span>
          <input
            className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
            value={final_score}
            onChange={(e) => setFinalScore(e.target.value)}
            placeholder="35-21"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Game Result</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setResult("W")}
            className={`rounded-lg border px-4 py-3 font-mono text-sm font-semibold transition-colors ${
              result === "W" ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"
            }`}
          >
            W
          </button>
          <button
            type="button"
            onClick={() => setResult("L")}
            className={`rounded-lg border px-4 py-3 font-mono text-sm font-semibold transition-colors ${
              result === "L" ? "border-red-500 bg-red-500/15 text-red-300" : "border-slate-700 bg-slate-900 text-slate-400"
            }`}
          >
            L
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => {
          const setup: GameSetup = {
            offensive_team: offensive_team.trim(),
            offensive_scheme: offensive_scheme.trim(),
            opponent_team: opponent_team.trim(),
            opponent_defensive_scheme: opponent_defensive_scheme.trim(),
            final_score: final_score.trim(),
            result,
          };
          setLastGame({ my_playbook: setup.offensive_team, my_scheme: setup.offensive_scheme });
          onNext(setup);
        }}
        className="w-full rounded-lg bg-emerald-500 py-3.5 font-display text-lg tracking-wide text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
      >
        Next → Download Template
      </button>
    </div>
  );
}
