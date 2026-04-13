"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
  const [form, setForm] = useState<NewGameForm>({
    my_playbook: "",
    my_scheme: "",
    opponent_team: "",
    opponent_scheme: "",
    game_date: new Date().toISOString().slice(0, 10),
    my_score: 0,
    opponent_score: 0,
    result: "W",
    quarter_started_logging: 1,
  });

  useEffect(() => {
    fetch("/api/film/setup")
      .then((res) => res.json())
      .then((data: { offensiveTeams: OffensiveTeam[]; defensiveTeams: DefensiveTeam[] }) => {
        setOffensiveTeams(data.offensiveTeams ?? []);
        setDefensiveTeams(data.defensiveTeams ?? []);
      });
  }, []);

  const offensiveTeamNames = useMemo(() => offensiveTeams.map((t) => t.team_name), [offensiveTeams]);
  const defensiveTeamNames = useMemo(() => defensiveTeams.map((t) => t.team_name), [defensiveTeams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/games", { method: "POST", body: JSON.stringify(form) });
    const game = (await res.json()) as { id: string };
    router.push(`/film/${game.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-3xl">New Game Setup</h1>
      <datalist id="my-playbook-options">
        {offensiveTeamNames.map((team) => (
          <option key={team} value={team} />
        ))}
      </datalist>
      <datalist id="opponent-options">
        {defensiveTeamNames.map((team) => (
          <option key={team} value={team} />
        ))}
      </datalist>
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">My Playbook</span>
        <input
          list="my-playbook-options"
          className="w-full rounded border border-slate-700 bg-slate-900"
          value={form.my_playbook}
          onChange={(e) => {
            const selected = offensiveTeams.find((t) => t.team_name.toLowerCase() === e.target.value.toLowerCase());
            setForm((p) => ({
              ...p,
              my_playbook: e.target.value,
              my_scheme: selected?.scheme_style ?? p.my_scheme,
            }));
          }}
          placeholder="Search team"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">My Scheme</span>
        <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.my_scheme} onChange={(e) => setForm((p) => ({ ...p, my_scheme: e.target.value }))} placeholder="Auto-mapped from team" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">Opponent</span>
        <input
          list="opponent-options"
          className="w-full rounded border border-slate-700 bg-slate-900"
          value={form.opponent_team}
          onChange={(e) => {
            const selected = defensiveTeams.find((t) => t.team_name.toLowerCase() === e.target.value.toLowerCase());
            setForm((p) => ({
              ...p,
              opponent_team: e.target.value,
              opponent_scheme: selected?.defensive_scheme ?? p.opponent_scheme,
            }));
          }}
          placeholder="Search team"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">Opponent Scheme</span>
        <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.opponent_scheme} onChange={(e) => setForm((p) => ({ ...p, opponent_scheme: e.target.value }))} placeholder="Auto-mapped from team" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
        <input className="w-full rounded border border-slate-700 bg-slate-900" type="date" value={form.game_date} onChange={(e) => setForm((p) => ({ ...p, game_date: e.target.value }))} />
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
      <button className="w-full rounded bg-emerald-500 px-4 py-2 text-slate-950">Start Logging</button>
    </form>
  );
}
