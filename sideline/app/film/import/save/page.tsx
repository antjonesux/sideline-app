"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { NewGameFormSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { IMPORT_FAILED } from "@/lib/coachCopy";
import { isCoachCallPlay } from "@/lib/filmPlayCounting";
import { emitProductEvent, markMilestoneFired, wasMilestoneFired } from "@/lib/productAnalytics";
import { CFB_CATALOG_GAME_VERSION } from "@/lib/constants";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { createClient } from "@/lib/supabase/client";
import { useImportStore } from "@/store/importStore";
import { useToastStore } from "@/store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type OffensiveTeam = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };
type CfbPlaybookRow = { playbook: string | null };
type PlaybookOption = { team_name: string; playbook_name: string };

let cachedOffensive: OffensiveTeam[] | null = null;
let cachedDefensive: DefensiveTeam[] | null = null;
let cachedFallbackPlaybooks: string[] | null = null;

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";

function uniquePlaybookOptions(rows: OffensiveTeam[], fallbackPlaybooks: string[]): PlaybookOption[] {
  const byPlaybook = new Map<string, PlaybookOption>();
  for (const row of rows) {
    const key = row.playbook_name.trim();
    if (!key || byPlaybook.has(key)) continue;
    byPlaybook.set(key, { team_name: key, playbook_name: key });
  }
  for (const playbook of fallbackPlaybooks) {
    const key = playbook.trim();
    if (!key || byPlaybook.has(key)) continue;
    byPlaybook.set(key, { team_name: key, playbook_name: key });
  }
  return [...byPlaybook.values()].sort((a, b) => a.playbook_name.localeCompare(b.playbook_name));
}

export default function FilmImportSavePage() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { parsedRows, validRows, setStep, setGameSetup, setImportedSession } = useImportStore();
  const addToast = useToastStore((s) => s.addToast);

  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>(() => cachedOffensive ?? []);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [fallbackPlaybooks, setFallbackPlaybooks] = useState<string[]>(() => cachedFallbackPlaybooks ?? []);
  const [setupLoading, setSetupLoading] = useState(
    () => cachedOffensive === null || cachedDefensive === null || cachedFallbackPlaybooks === null,
  );
  const [setupError, setSetupError] = useState<string | null>(null);

  const [myTeam, setMyTeam] = useState<TeamOption | null>(null);
  const [opponent, setOpponent] = useState<DefensiveTeam | null>(null);
  const [playbookRow, setPlaybookRow] = useState<PlaybookOption | null>(null);
  const [form, setForm] = useState({ my_score: "0", opponent_score: "0", result: "W" as "W" | "L" });
  const [submitBusy, setSubmitBusy] = useState(false);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const playbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (parsedRows.length === 0) {
      router.replace("/film/import");
    }
  }, [parsedRows.length, router]);

  useEffect(() => {
    let cancelled = false;

    if (cachedOffensive !== null && cachedDefensive !== null && cachedFallbackPlaybooks !== null) {
      return;
    }

    async function loadTeams() {
      setSetupLoading(true);
      setSetupError(null);
      const [offRes, defRes, playbookRes] = await Promise.all([
        supabase.from("team_offensive_playbooks").select("team_name, playbook_name, scheme_style").order("team_name"),
        supabase.from("team_defensive_schemes").select("team_name, defensive_scheme").order("team_name"),
        supabase
          .from("cfb26_plays")
          .select("playbook")
          .eq("game_version", CFB_CATALOG_GAME_VERSION)
          .not("playbook", "is", null)
          .order("playbook"),
      ]);
      if (cancelled) return;

      const err = offRes.error ?? defRes.error;
      if (err) {
        console.error("Import save setup Supabase error:", err);
        setSetupError(err.message || "Could not load teams from Supabase.");
        setOffensiveTeams([]);
        setDefensiveTeams([]);
        setSetupLoading(false);
        return;
      }
      if (playbookRes.error) {
        console.warn("Import save fallback playbook lookup failed:", playbookRes.error.message);
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

  const allTeamOptions = useMemo<TeamOption[]>(
    () => Array.from(new Set(defensiveTeams.map((t) => t.team_name))).map((team_name) => ({ team_name })),
    [defensiveTeams],
  );

  const playbookOptions = useMemo<PlaybookOption[]>(
    () => uniquePlaybookOptions(offensiveTeams, fallbackPlaybooks),
    [offensiveTeams, fallbackPlaybooks],
  );

  useEffect(() => {
    setPlaybookRow((prev) => {
      if (!playbookOptions.length) return null;
      if (!prev) return playbookOptions[0] ?? null;
      const match = playbookOptions.find((row) => row.playbook_name === prev.playbook_name);
      return match ?? playbookOptions[0] ?? null;
    });
  }, [playbookOptions]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!myTeam || !opponent || !playbookRow || validRows.length === 0) return;

    setSubmitBusy(true);
    try {
      const nextSetup = {
        my_team: myTeam.team_name,
        opponent_team: opponent.team_name,
        offensive_playbook: playbookRow.playbook_name,
        my_score: Math.max(0, Number.parseInt(form.my_score.replace(/\D/g, ""), 10) || 0),
        opponent_score: Math.max(0, Number.parseInt(form.opponent_score.replace(/\D/g, ""), 10) || 0),
        result: form.result,
      };
      setGameSetup(nextSetup);

      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: nextSetup,
          plays: validRows,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { session_id?: string; error?: string };
      if (!res.ok || !body.session_id) {
        addToast(IMPORT_FAILED, "error");
        return;
      }

      const gid = body.session_id;
      emitProductEvent("game_created", { gameId: gid, source: "import_csv" });
      if (validRows.length >= 1 && !wasMilestoneFired("first_play", gid)) {
        markMilestoneFired("first_play", gid);
        emitProductEvent("first_play", { gameId: gid, source: "import_csv" });
      }
      const coachN = validRows.filter((r) => isCoachCallPlay({ play_name: r.play_name, result_tag: r.result_db })).length;
      if (coachN >= 10 && !wasMilestoneFired("ten_plays", gid)) {
        markMilestoneFired("ten_plays", gid);
        emitProductEvent("ten_plays", { gameId: gid, source: "import_csv" });
      }

      setImportedSession(body.session_id);
      addToast(`${validRows.length} calls logged.`, "success");
      void queryClient.invalidateQueries({ queryKey: tendenciesQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["games", "list"] });
      router.push("/film/import/complete");
    } finally {
      setSubmitBusy(false);
    }
  }

  const canSubmit = Boolean(myTeam && opponent && playbookRow && !setupLoading && validRows.length > 0);

  if (parsedRows.length === 0) {
    return (
      <section className="space-y-6">
        <BackToFilmLink />
        <NewGameFormSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <Breadcrumb segments={[{ label: "Film", href: "/film" }, { label: "Import", href: "/film/import" }, { label: "Tag Game" }]} />
      <BackToFilmLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        {setupLoading ? (
          <NewGameFormSkeleton />
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">Tag this game</h1>

          {setupError ? (
            <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-4 font-body text-sm text-amber-100" role="alert">
              {setupError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TeamCombobox<TeamOption>
              label="Your Team"
              inputId="import-my-team"
              selected={myTeam}
              onSelect={setMyTeam}
              options={allTeamOptions}
              loading={setupLoading}
              placeholder="Tap to browse or type to filter"
              nextFocusRef={opponentInputRef}
            />

            <TeamCombobox<DefensiveTeam>
              label="Opponent"
              inputId="import-opponent"
              inputRef={opponentInputRef}
              selected={opponent}
              onSelect={setOpponent}
              options={defensiveTeams}
              loading={setupLoading}
              placeholder="Tap to browse or type to filter"
              nextFocusRef={playbookInputRef}
            />
          </div>

          <div className="space-y-1 md:max-w-2xl">
            <TeamCombobox<PlaybookOption>
              label="Offensive Playbook"
              inputId="import-offensive-playbook"
              inputRef={playbookInputRef}
              selected={playbookRow}
              onSelect={setPlaybookRow}
              options={playbookOptions}
              loading={setupLoading}
              placeholder="Tap to browse or type to filter"
              getOptionLabel={(row) => row.playbook_name}
              getSearchText={(row) => row.playbook_name}
            />
            <p className="font-body text-xs text-slate-500">All playbooks are available.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">My score</span>
              <input
                className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.my_score}
                onChange={(e) => setForm((p) => ({ ...p, my_score: e.target.value.replace(/\D/g, "") }))}
              />
            </label>
            <label className="space-y-1">
              <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Their score</span>
              <input
                className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.opponent_score}
                onChange={(e) => setForm((p) => ({ ...p, opponent_score: e.target.value.replace(/\D/g, "") }))}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Game result</p>
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

          <Button type="submit" variant="default" size="lg" className="w-full flex-1" disabled={!canSubmit || submitBusy}>
            {submitBusy ? "Importing…" : `Import ${validRows.length} plays`}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full py-3 text-sm"
            onClick={() => {
              setStep(2);
              router.push("/film/import/preview");
            }}
          >
            Back to preview
          </Button>
        </form>
        )}
      </div>
    </section>
  );
}
