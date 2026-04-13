"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

export default function NewGamePage() {
  const router = useRouter();
  const [form, setForm] = useState<NewGameForm>({
    my_playbook: "Washington State",
    my_scheme: "Power Spread",
    opponent_team: "Oregon",
    opponent_scheme: "3-3-5",
    game_date: new Date().toISOString().slice(0, 10),
    my_score: 0,
    opponent_score: 0,
    result: "W",
    quarter_started_logging: 1,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/games", { method: "POST", body: JSON.stringify(form) });
    const game = (await res.json()) as { id: string };
    router.push(`/film/${game.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h1 className="font-display text-3xl">New Game Setup</h1>
      <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.my_playbook} onChange={(e) => setForm((p) => ({ ...p, my_playbook: e.target.value }))} placeholder="My Playbook" />
      <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.my_scheme} onChange={(e) => setForm((p) => ({ ...p, my_scheme: e.target.value }))} placeholder="My Scheme" />
      <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.opponent_team} onChange={(e) => setForm((p) => ({ ...p, opponent_team: e.target.value }))} placeholder="Opponent" />
      <input className="w-full rounded border border-slate-700 bg-slate-900" value={form.opponent_scheme} onChange={(e) => setForm((p) => ({ ...p, opponent_scheme: e.target.value }))} placeholder="Opponent Scheme" />
      <input className="w-full rounded border border-slate-700 bg-slate-900" type="date" value={form.game_date} onChange={(e) => setForm((p) => ({ ...p, game_date: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <input className="w-full rounded border border-slate-700 bg-slate-900" type="number" value={form.my_score} onChange={(e) => setForm((p) => ({ ...p, my_score: Number(e.target.value) }))} placeholder="My Score" />
        <input className="w-full rounded border border-slate-700 bg-slate-900" type="number" value={form.opponent_score} onChange={(e) => setForm((p) => ({ ...p, opponent_score: Number(e.target.value) }))} placeholder="Opp Score" />
      </div>
      <button className="w-full rounded bg-emerald-500 px-4 py-2 text-slate-950">Start Logging</button>
    </form>
  );
}
