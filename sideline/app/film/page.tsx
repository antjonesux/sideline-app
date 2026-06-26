import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  FILM_ROOM_EMPTY_BODY,
  FILM_ROOM_EMPTY_CTA,
  FILM_ROOM_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { FilmGameCard } from "@/components/film/FilmGameCard";
import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type GameSessionRow = {
  id: string;
  my_playbook: string;
  my_scheme: string;
  offensive_playbook?: string | null;
  opponent_team: string;
  opponent_scheme: string;
  my_score: number | null;
  opponent_score: number | null;
  result: "W" | "L" | null;
  game_date: string;
  quarter_started_logging: number | null;
  created_at: string;
  import_source?: string | null;
};

type LoggedPlayStatsRow = {
  game_session_id: string;
  play_name: string | null;
  yards_gained: number | null;
  result_tag: string | null;
};

type GameWithCounts = GameSessionRow & {
  driveCount: number;
  playCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
};

async function getGamesWithCounts(userId: string): Promise<GameWithCounts[]> {
  const supabase = await createClient();
  const { data: gamesRaw, error: gameError } = await supabase
    .from("game_sessions")
    .select(
      "id, my_playbook, my_scheme, offensive_playbook, opponent_team, opponent_scheme, my_score, opponent_score, result, game_date, quarter_started_logging, created_at, import_source",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (gameError || !gamesRaw?.length) return [];

  const games = (gamesRaw as GameSessionRow[]).filter(
    (g) => g.import_source !== GAME_SESSION_IMPORT_SOURCE_ONBOARDING,
  );
  if (games.length === 0) return [];

  const gameIds = games.map((g) => g.id);

  const [{ data: drives }, { data: loggedPlays, error: playError }] = await Promise.all([
    supabase.from("drives").select("id, game_session_id").eq("user_id", userId).in("game_session_id", gameIds),
    supabase
      .from("logged_plays")
      .select("game_session_id, play_name, yards_gained, result_tag")
      .eq("user_id", userId)
      .in("game_session_id", gameIds),
  ]);

  const driveCountByGame = new Map<string, number>();
  for (const d of drives ?? []) {
    driveCountByGame.set(d.game_session_id, (driveCountByGame.get(d.game_session_id) ?? 0) + 1);
  }

  if (playError) {
    return (games as GameSessionRow[]).map((game) => ({
      ...game,
      driveCount: driveCountByGame.get(game.id) ?? 0,
      playCount: 0,
      totalYards: 0,
      tds: 0,
      turnovers: 0,
    }));
  }

  const byGame = new Map<string, { playCount: number; totalYards: number; tds: number; turnovers: number }>();

  for (const play of (loggedPlays ?? []) as LoggedPlayStatsRow[]) {
    const playName = String(play.play_name ?? "").trim().toLowerCase();
    const resultTag = String(play.result_tag ?? "").trim().toLowerCase();
    if (playName === "punt" || resultTag === "punt") continue;
    const current = byGame.get(play.game_session_id) ?? {
      playCount: 0,
      totalYards: 0,
      tds: 0,
      turnovers: 0,
    };
    current.playCount += 1;
    current.totalYards += play.yards_gained ?? 0;
    if (play.result_tag === "TOUCHDOWN") current.tds += 1;
    if (play.result_tag === "TURNOVER") current.turnovers += 1;
    byGame.set(play.game_session_id, current);
  }

  return (games as GameSessionRow[]).map((game) => {
    const agg = byGame.get(game.id);
    return {
      ...game,
      driveCount: driveCountByGame.get(game.id) ?? 0,
      playCount: agg?.playCount ?? 0,
      totalYards: agg?.totalYards ?? 0,
      tds: agg?.tds ?? 0,
      turnovers: agg?.turnovers ?? 0,
    };
  });
}

export default async function FilmRoomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/landing?next=${encodeURIComponent("/film")}`);

  const games = await getGamesWithCounts(user.id);

  return (
    <section className="space-y-6">
      <header className="space-y-4">
        <AppShellMenuHeader title="Film room" />
        {games.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/film/new" className="rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70 group block">
                <p className="font-heading text-lg font-bold uppercase tracking-wide text-white">New game</p>
                <p className="mt-1 font-sans text-sm text-slate-400">Log plays live during a game.</p>
              </Link>
            </div>
            <div className="border-b border-slate-700" aria-hidden />
          </>
        )}
      </header>

      {games.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 flex min-h-[320px] flex-col items-center justify-center py-10 text-center sm:px-8">
          <p className="font-sans text-base font-medium text-white">{FILM_ROOM_EMPTY_HEADLINE}</p>
          <p className="mt-2 font-sans text-sm text-slate-500">{FILM_ROOM_EMPTY_BODY}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="default" className="text-sm">
              <Link href="/film/new">{FILM_ROOM_EMPTY_CTA}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map((game) => <FilmGameCard key={game.id} game={game} />)}
        </ul>
      )}
    </section>
  );
}
