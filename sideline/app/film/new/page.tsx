"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type NewGameForm = {
  my_playbook: string;
  my_scheme: string;
  opponent_team: string;
  opponent_scheme: string;
  game_date: string;
  my_score: number;
  opponent_score: number;
  result: "W" | "L";
  quarter_started_logging: number;
};

type OffensiveTeam = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveTeam = { team_name: string; defensive_scheme: string };

export default function NewGamePage() {
  const router = useRouter();
  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>([]);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);
  const [offensePick, setOffensePick] = useState<OffensiveTeam | null>(null);
  const [defensePick, setDefensePick] = useState<DefensiveTeam | null>(null);
  const [form, setForm] = useState<Omit<NewGameForm, "my_playbook" | "my_scheme" | "opponent_team" | "opponent_scheme">>({
    game_date: new Date().toISOString().slice(0, 10),
    my_score: 0,
    opponent_score: 0,
    result: "W",
    quarter_started_logging: 1,
  });

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const gameDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setSetupLoading(true);
    fetch("/api/film/setup")
      .then((res) => res.json())
      .then((data: { offensiveTeams: OffensiveTeam[]; defensiveTeams: DefensiveTeam[] }) => {
        if (cancelled) return;
        setOffensiveTeams(data.offensiveTeams ?? []);
        setDefensiveTeams(data.defensiveTeams ?? []);
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!offensePick || !defensePick) {
      window.alert("Select your team and opponent from the lists so schemes can be set.");
      return;
    }
    const payload: NewGameForm = {
      ...form,
      my_playbook: offensePick.team_name,
      my_scheme: offensePick.scheme_style,
      opponent_team: defensePick.team_name,
      opponent_scheme: defensePick.defensive_scheme,
    };
    const res = await fetch("/api/games", { method: "POST", body: JSON.stringify(payload) });
    const game = (await res.json()) as { id: string };
    router.push(`/film/${game.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-3xl">New Game Setup</h1>

      <TeamCombobox<OffensiveTeam>
        label="My Playbook"
        inputId="film-my-playbook"
        selected={offensePick}
        onSelect={setOffensePick}
        options={offensiveTeams}
        loading={setupLoading}
        placeholder="Tap to browse or type to filter"
        nextFocusRef={opponentInputRef}
      />

      <div className="space-y-1">
        <span className="block text-xs uppercase tracking-wide text-slate-400">My Scheme</span>
        {offensePick ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-100">
              {offensePick.scheme_style}
            </span>
            <button
              type="button"
              className="text-xs text-emerald-400 underline-offset-2 hover:underline"
              onClick={() => setOffensePick(null)}
            >
              change
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Choose your offensive team to load its scheme.</p>
        )}
      </div>

      <TeamCombobox<DefensiveTeam>
        label="Opponent"
        inputId="film-opponent"
        inputRef={opponentInputRef}
        selected={defensePick}
        onSelect={setDefensePick}
        options={defensiveTeams}
        loading={setupLoading}
        placeholder="Tap to browse or type to filter"
        nextFocusRef={gameDateInputRef}
      />

      <div className="space-y-1">
        <span className="block text-xs uppercase tracking-wide text-slate-400">Opponent Scheme</span>
        {defensePick ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-100">
              {defensePick.defensive_scheme}
            </span>
            <button
              type="button"
              className="text-xs text-emerald-400 underline-offset-2 hover:underline"
              onClick={() => setDefensePick(null)}
            >
              change
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Choose an opponent to load their defensive scheme.</p>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
        <input
          ref={gameDateInputRef}
          id="film-game-date"
          className="w-full rounded border border-slate-700 bg-slate-900"
          type="date"
          value={form.game_date}
          onChange={(e) => setForm((p) => ({ ...p, game_date: e.target.value }))}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">My Score</span>
          <input className="w-full rounded border border-slate-700 bg-slate-900" type="number" value={form.my_score} onChange={(e) => setForm((p) => ({ ...p, my_score: Number(e.target.value) }))} />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Their Score</span>
          <input className="w-full rounded border border-slate-700 bg-slate-900" type="number" value={form.opponent_score} onChange={(e) => setForm((p) => ({ ...p, opponent_score: Number(e.target.value) }))} />
        </label>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">Result</p>
        <div className="grid grid-cols-2 gap-2">
          {(["W", "L"] as const).map((result) => (
            <button
              key={result}
              type="button"
              onClick={() => setForm((p) => ({ ...p, result }))}
              className={`rounded border px-3 py-2 ${form.result === result ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900"}`}
            >
              {result}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">Quarter started logging</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((quarter) => (
            <button
              key={quarter}
              type="button"
              onClick={() => setForm((p) => ({ ...p, quarter_started_logging: quarter }))}
              className={`rounded border px-3 py-2 ${form.quarter_started_logging === quarter ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900"}`}
            >
              {quarter}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="w-full rounded bg-emerald-500 px-4 py-2 text-slate-950">
        Start Logging
      </button>
    </form>
  );
}
