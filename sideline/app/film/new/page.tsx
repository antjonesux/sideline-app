"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { supabase } from "@/lib/supabase";
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

let cachedOffensive: OffensiveTeam[] | null = null;
let cachedDefensive: DefensiveTeam[] | null = null;

export default function NewGamePage() {
  const router = useRouter();
  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>(() => cachedOffensive ?? []);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [setupLoading, setSetupLoading] = useState(() => cachedOffensive === null || cachedDefensive === null);
  const [setupError, setSetupError] = useState<string | null>(null);
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

    if (cachedOffensive !== null && cachedDefensive !== null) {
      return;
    }

    async function loadTeams() {
      setSetupLoading(true);
      setSetupError(null);
      const [offRes, defRes] = await Promise.all([
        supabase
          .from("team_offensive_playbooks")
          .select("team_name, playbook_name, scheme_style")
          .order("team_name"),
        supabase.from("team_defensive_schemes").select("team_name, defensive_scheme").order("team_name"),
      ]);
      if (cancelled) return;

      const err = offRes.error ?? defRes.error;
      if (err) {
        console.error("Film setup Supabase error:", err);
        setSetupError(err.message || "Could not load teams from Supabase.");
        setOffensiveTeams([]);
        setDefensiveTeams([]);
        setSetupLoading(false);
        return;
      }

      const offensive = (offRes.data ?? []) as OffensiveTeam[];
      const defensive = (defRes.data ?? []) as DefensiveTeam[];
      cachedOffensive = offensive;
      cachedDefensive = defensive;
      setOffensiveTeams(offensive);
      setDefensiveTeams(defensive);
      setSetupLoading(false);
    }

    void loadTeams();
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
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const game = (await res.json()) as { id?: string; error?: string };
    console.log("Game created response:", game);
    if (!game.id) {
      window.alert("Failed to create game: " + JSON.stringify(game));
      return;
    }
    router.push(`/film/${game.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-3xl">New Game Setup</h1>
      {setupError ? (
        <p className="rounded border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100" role="alert">
          {setupError}
        </p>
      ) : null}

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
          <input
            className="w-full rounded border border-slate-700 bg-slate-900"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.my_score}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setForm((p) => ({ ...p, my_score: val === "" ? 0 : parseInt(val, 10) }));
            }}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Their Score</span>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.opponent_score}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setForm((p) => ({ ...p, opponent_score: val === "" ? 0 : parseInt(val, 10) }));
            }}
          />
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
