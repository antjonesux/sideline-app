"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { NewGameFormSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/client";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
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
  const supabase = createClient();
  const router = useRouter();
  const { setLastGame } = useLastGamePrefsStore();
  const addToast = useToastStore((s) => s.addToast);

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
    my_score: "0",
    opponent_score: "0",
    result: "W" as "W" | "L",
  });
  const [submitBusy, setSubmitBusy] = useState(false);

  type SheetOption = { id: string; name: string };
  const [availableSheets, setAvailableSheets] = useState<SheetOption[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectedSheetId(null);
    if (!selectedPlaybookName) {
      setAvailableSheets([]);
      return;
    }
    let cancelled = false;
    setSheetsLoading(true);
    void (async () => {
      const res = await fetch("/api/playbook", { cache: "no-store" });
      const json = (await res.json()) as {
        playbooks?: Array<{ id: string; name: string; cfb26_playbook?: string | null }>;
      };
      if (cancelled) return;
      const norm = selectedPlaybookName.trim().toLowerCase();
      const matching = (json.playbooks ?? []).filter(
        (row) => (row.cfb26_playbook ?? "").trim().toLowerCase() === norm,
      );
      setAvailableSheets(matching.map((row) => ({ id: row.id, name: row.name })));
      setSheetsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlaybookName]);

  const canContinue = Boolean(offensePick && defensePick && playbookRow && !setupLoading);

  const buildGameSetup = useCallback(() => {
    if (!offensePick || !defensePick || !playbookRow) return null;
    const myScore = Math.max(0, Number.parseInt(form.my_score.replace(/\D/g, ""), 10) || 0);
    const oppScore = Math.max(0, Number.parseInt(form.opponent_score.replace(/\D/g, ""), 10) || 0);
    return {
      offensive_team: offensePick.team_name,
      offensive_scheme: playbookRow.scheme_style,
      offensive_playbook: playbookRow.playbook_name,
      opponent_team: defensePick.team_name,
      opponent_defensive_scheme: defensePick.defensive_scheme,
      game_date: new Date().toISOString().slice(0, 10),
      my_score: myScore,
      opponent_score: oppScore,
      final_score: `${myScore}-${oppScore}`,
      result: form.result,
    };
  }, [offensePick, defensePick, playbookRow, form.my_score, form.opponent_score, form.result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const setup = buildGameSetup();
    if (!setup) {
      addToast("Set offense, defense, and play sheet first.", "error");
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
          play_sheet_id: selectedSheetId ?? null,
        }),
      });
      const game = (await res.json()) as { id?: string; error?: string };
      if (!game.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      setLastGame({ my_playbook: setup.offensive_team, my_scheme: setup.offensive_scheme });
      addToast("Game ready.", "success");
      router.push(`/film/${game.id}`);
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <section className="space-y-8">
      <Breadcrumb segments={[{ label: "Film", href: "/film" }, { label: "New Game" }]} />
      <BackToFilmLink />

      <div className="app-shell">
        {setupLoading ? (
          <NewGameFormSkeleton />
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="app-page-title">New game setup</h1>

          {setupError ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-4 font-body text-sm text-amber-100" role="alert">
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
            {!usePlaybookSelect ? <p className="font-body text-xs text-slate-500">Playbook list is unavailable.</p> : null}
            <p className="font-body text-xs text-slate-500">You can use any playbook, not just your team&apos;s.</p>
          </div>

          {selectedPlaybookName ? (
            <div className="space-y-2 md:max-w-2xl">
              <p className="app-field-label">Game Plan</p>
              {sheetsLoading ? (
                <p className="font-body text-xs text-slate-500">Loading play sheets…</p>
              ) : availableSheets.length === 0 ? (
                <p className="font-body text-xs text-slate-500">
                  No play sheets for this playbook yet.{" "}
                  <a href="/playbook" className="text-emerald-400 hover:text-emerald-300">Create one in Game Plan</a>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSheetId(null)}
                    className={`min-h-11 rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
                      selectedSheetId === null ? toggleOn : toggleOff
                    }`}
                  >
                    None
                  </button>
                  {availableSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => setSelectedSheetId(sheet.id)}
                      className={`min-h-11 rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
                        selectedSheetId === sheet.id ? toggleOn : toggleOff
                      }`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="app-field-label">My score</span>
              <input
                className="hs-input app-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.my_score}
                onChange={(e) => setForm((p) => ({ ...p, my_score: e.target.value.replace(/\D/g, "") }))}
              />
            </label>
            <label className="space-y-1">
              <span className="app-field-label">Their score</span>
              <input
                className="hs-input app-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.opponent_score}
                onChange={(e) => setForm((p) => ({ ...p, opponent_score: e.target.value.replace(/\D/g, "") }))}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="app-field-label">Game result</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, result: "W" }))}
                className={`rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors ${
                  form.result === "W" ? toggleOn : toggleOff
                }`}
              >
                W
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, result: "L" }))}
                className={`rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors ${
                  form.result === "L" ? "border-red-500 bg-red-500/15 text-red-300" : toggleOff
                }`}
              >
                L
              </button>
            </div>
          </div>

          <button type="submit" disabled={!canContinue || submitBusy} className="btn-primary-block py-3 text-sm uppercase tracking-wide">
            {submitBusy ? "Starting…" : "Start Logging"}
          </button>
        </form>
        )}
      </div>
    </section>
  );
}
