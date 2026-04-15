"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { supabase } from "@/lib/supabase";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type OffensiveTeam = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };
type CfbPlaybookRow = { playbook: string | null };

function playbookOptionLabel(row: OffensiveTeam): string {
  if (row.playbook_name.trim() === row.team_name.trim()) {
    return row.playbook_name;
  }
  return `${row.playbook_name} (${row.team_name})`;
}

function uniquePlaybookOptions(rows: OffensiveTeam[], fallbackPlaybooks: string[], fallbackScheme: string): OffensiveTeam[] {
  const byPlaybook = new Map<string, OffensiveTeam>();
  for (const row of rows) {
    const key = row.playbook_name.trim();
    if (!key) continue;
    if (!byPlaybook.has(key)) byPlaybook.set(key, row);
  }
  for (const playbook of fallbackPlaybooks) {
    const key = playbook.trim();
    if (!key || byPlaybook.has(key)) continue;
    byPlaybook.set(key, {
      team_name: playbook,
      playbook_name: playbook,
      scheme_style: fallbackScheme,
    });
  }
  return [...byPlaybook.values()].sort((a, b) => a.playbook_name.localeCompare(b.playbook_name));
}

let cachedOffensive: OffensiveTeam[] | null = null;
let cachedDefensive: DefensiveTeam[] | null = null;
let cachedFallbackPlaybooks: string[] | null = null;

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";
export default function NewGamePage() {
  const router = useRouter();
  const { setLastGame } = useLastGamePrefsStore();

  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>(() => cachedOffensive ?? []);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [fallbackPlaybooks, setFallbackPlaybooks] = useState<string[]>(() => cachedFallbackPlaybooks ?? []);
  const [setupLoading, setSetupLoading] = useState(
    () => cachedOffensive === null || cachedDefensive === null || cachedFallbackPlaybooks === null,
  );
  const [setupError, setSetupError] = useState<string | null>(null);
  const [offensePick, setOffensePick] = useState<TeamOption | null>(null);
  const [defensePick, setDefensePick] = useState<DefensiveTeam | null>(null);
  /** Store only the playbook id string — never an object from `playbookOptions` — so nothing can "default" to the first row. */
  const [selectedPlaybookName, setSelectedPlaybookName] = useState<string | null>(null);
  const [form, setForm] = useState({
    my_score: 0,
    opponent_score: 0,
    result: "W" as "W" | "L",
  });
  const [submitBusy, setSubmitBusy] = useState(false);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const playbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedOffensive !== null && cachedDefensive !== null && cachedFallbackPlaybooks !== null) {
      return;
    }

    async function loadTeams() {
      setSetupLoading(true);
      setSetupError(null);
      const [offRes, defRes, playbookRes] = await Promise.all([
        supabase
          .from("team_offensive_playbooks")
          .select("team_name, playbook_name, scheme_style")
          .order("team_name", { ascending: true })
          .limit(20000),
        supabase
          .from("team_defensive_schemes")
          .select("team_name, defensive_scheme")
          .order("team_name", { ascending: true })
          .limit(20000),
        supabase.from("cfb26_plays").select("playbook").not("playbook", "is", null).order("playbook"),
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
      if (playbookRes.error) {
        console.warn("Fallback playbook lookup failed:", playbookRes.error.message);
      }

      const offensive = (offRes.data ?? []) as OffensiveTeam[];
      const defensive = (defRes.data ?? []) as DefensiveTeam[];
      const fallback = Array.from(
        new Set(
          ((playbookRes.data ?? []) as CfbPlaybookRow[])
            .map((r) => (r.playbook ?? "").trim())
            .filter((v) => v.length > 0),
        ),
      );
      cachedOffensive = offensive;
      cachedDefensive = defensive;
      cachedFallbackPlaybooks = fallback;
      setOffensiveTeams(offensive);
      setDefensiveTeams(defensive);
      setFallbackPlaybooks(fallback);
      setSetupLoading(false);
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Full `team_defensive_schemes` team list (same rows as Opponent), sorted for stable combobox order. */
  const allTeamOptions = useMemo<TeamOption[]>(
    () =>
      [...new Set(defensiveTeams.map((t) => t.team_name.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((team_name) => ({ team_name })),
    [defensiveTeams],
  );

  const playbookOptions = useMemo<OffensiveTeam[]>(
    () => uniquePlaybookOptions(offensiveTeams, fallbackPlaybooks, "Multiple"),
    [offensiveTeams, fallbackPlaybooks],
  );

  const usePlaybookSelect = playbookOptions.length > 0 && !setupError;

  const playbookRow = useMemo(() => {
    if (!selectedPlaybookName) return null;
    return playbookOptions.find((row) => row.playbook_name === selectedPlaybookName) ?? null;
  }, [playbookOptions, selectedPlaybookName]);

  useEffect(() => {
    if (!selectedPlaybookName || playbookOptions.length === 0) return;
    if (!playbookOptions.some((row) => row.playbook_name === selectedPlaybookName)) {
      setSelectedPlaybookName(null);
    }
  }, [playbookOptions, selectedPlaybookName]);

  const canContinue = Boolean(offensePick && defensePick && playbookRow && !setupLoading);

  const buildGameSetup = useCallback(() => {
    if (!offensePick || !defensePick || !playbookRow) return null;
    return {
      offensive_team: offensePick.team_name,
      offensive_scheme: playbookRow.scheme_style,
      offensive_playbook: playbookRow.playbook_name,
      opponent_team: defensePick.team_name,
      opponent_defensive_scheme: defensePick.defensive_scheme,
      game_date: new Date().toISOString().slice(0, 10),
      my_score: form.my_score,
      opponent_score: form.opponent_score,
      final_score: `${form.my_score}-${form.opponent_score}`,
      result: form.result,
    };
  }, [offensePick, defensePick, playbookRow, form.my_score, form.opponent_score, form.result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const setup = buildGameSetup();
    if (!setup) {
      window.alert("Select your team, offensive playbook, and opponent so schemes and metadata are set.");
      return;
    }

    setSubmitBusy(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: setup.offensive_team,
          my_scheme: setup.offensive_scheme,
          offensive_playbook: setup.offensive_playbook,
          opponent_team: setup.opponent_team,
          opponent_scheme: setup.opponent_defensive_scheme,
          game_date: setup.game_date,
          my_score: setup.my_score,
          opponent_score: setup.opponent_score,
          result: setup.result,
        }),
      });
      const game = (await res.json()) as { id?: string; error?: string };
      if (!game.id) {
        window.alert("Failed to create game: " + (game.error ?? JSON.stringify(game)));
        return;
      }
      setLastGame({ my_playbook: setup.offensive_team, my_scheme: setup.offensive_scheme });
      router.push(`/film/${game.id}`);
    } finally {
      setSubmitBusy(false);
    }
  }

  const primaryActionClass =
    "w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500";

  return (
    <section className="space-y-8 pb-8">
      <BackToFilmLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="font-display text-3xl tracking-wide text-white">New Game Setup</h1>

          {setupError ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-4 text-sm text-amber-100" role="alert">
              {setupError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TeamCombobox<TeamOption>
              label="Your Team"
              inputId="film-my-playbook"
              selected={offensePick}
              onSelect={setOffensePick}
              options={allTeamOptions}
              loading={setupLoading}
              placeholder="Select your team"
              nextFocusRef={opponentInputRef}
            />

            <TeamCombobox<DefensiveTeam>
              label="Opponent"
              inputId="film-opponent"
              inputRef={opponentInputRef}
              selected={defensePick}
              onSelect={setDefensePick}
              options={defensiveTeams}
              loading={setupLoading}
              placeholder="Select opponent"
              nextFocusRef={playbookInputRef}
            />
          </div>

          <div className="space-y-1 md:max-w-2xl">
            <TeamCombobox<OffensiveTeam>
              label="Offensive Playbook"
              inputId="film-offensive-playbook"
              inputRef={playbookInputRef}
              selected={playbookRow}
              onSelect={(row) => setSelectedPlaybookName(row?.playbook_name ?? null)}
              options={playbookOptions}
              loading={setupLoading}
              placeholder="Select playbook"
              getOptionLabel={playbookOptionLabel}
              getOptionKey={(row) => row.playbook_name}
              getSearchText={(row) => `${row.playbook_name} ${row.team_name}`}
            />
            {!usePlaybookSelect ? <p className="text-xs text-slate-500">Playbook list is unavailable.</p> : null}
            <p className="text-xs text-slate-500">You can use any playbook, not just your team&apos;s.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-widest text-slate-500">My Score</span>
              <input
                className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
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
              <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Their Score</span>
              <input
                className="hs-input block w-full rounded-lg border dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-100"
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

          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Game Result</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, result: "W" }))}
                className={`rounded-lg border px-4 py-3 font-mono text-sm font-semibold transition-colors ${
                  form.result === "W" ? toggleOn : toggleOff
                }`}
              >
                W
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, result: "L" }))}
                className={`rounded-lg border px-4 py-3 font-mono text-sm font-semibold transition-colors ${
                  form.result === "L" ? "border-red-500 bg-red-500/15 text-red-300" : toggleOff
                }`}
              >
                L
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canContinue || submitBusy}
            className={primaryActionClass}
          >
            {submitBusy ? "Starting…" : "START LOGGING"}
          </button>
        </form>
      </div>
    </section>
  );
}
