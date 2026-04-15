import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FilmGameCard } from "@/components/film/FilmGameCard";

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
};

type LoggedPlayStatsRow = {
  game_session_id: string;
  drive_id: string | null;
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

async function getGamesWithCounts(): Promise<GameWithCounts[]> {
  const { data: games, error: gameError } = await supabase
    .from("game_sessions")
    .select(
      "id, my_playbook, my_scheme, offensive_playbook, opponent_team, opponent_scheme, my_score, opponent_score, result, game_date, quarter_started_logging, created_at",
    )
    .order("created_at", { ascending: false });

  if (gameError || !games?.length) return [];

  const gameIds = games.map((g) => g.id);
  const { data: loggedPlays, error: playError } = await supabase
    .from("logged_plays")
    .select("game_session_id, drive_id, play_name, yards_gained, result_tag")
    .in("game_session_id", gameIds);

  if (playError) {
    return (games as GameSessionRow[]).map((game) => ({
      ...game,
      driveCount: 0,
      playCount: 0,
      totalYards: 0,
      tds: 0,
      turnovers: 0,
    }));
  }

  const byGame = new Map<
    string,
    { playCount: number; driveIds: Set<string>; totalYards: number; tds: number; turnovers: number }
  >();

  for (const play of (loggedPlays ?? []) as LoggedPlayStatsRow[]) {
    const playName = String(play.play_name ?? "").trim().toLowerCase();
    const resultTag = String(play.result_tag ?? "").trim().toLowerCase();
    if (playName === "punt" || resultTag === "punt") continue;
    const current = byGame.get(play.game_session_id) ?? {
      playCount: 0,
      driveIds: new Set<string>(),
      totalYards: 0,
      tds: 0,
      turnovers: 0,
    };
    current.playCount += 1;
    if (play.drive_id) current.driveIds.add(play.drive_id);
    current.totalYards += play.yards_gained ?? 0;
    if (play.result_tag === "TOUCHDOWN") current.tds += 1;
    if (play.result_tag === "TURNOVER") current.turnovers += 1;
    byGame.set(play.game_session_id, current);
  }

  return (games as GameSessionRow[]).map((game) => {
    const agg = byGame.get(game.id);
    return {
      ...game,
      driveCount: agg?.driveIds.size ?? 0,
      playCount: agg?.playCount ?? 0,
      totalYards: agg?.totalYards ?? 0,
      tds: agg?.tds ?? 0,
      turnovers: agg?.turnovers ?? 0,
    };
  });
}

export default async function FilmRoomPage() {
  const games = await getGamesWithCounts();

  return (
    <section className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="app-page-title">Film room</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/film/new" className="app-card-interactive group block">
            <p className="app-card-title">New game</p>
            <p className="mt-1 font-body text-sm text-slate-400">Start a live sideline logging session.</p>
          </Link>
          <Link href="/film/import" className="app-card-interactive group block">
            <p className="app-card-title">Import from CSV</p>
            <p className="mt-1 font-body text-sm text-slate-400">Upload completed drive and play data from a CSV file.</p>
          </Link>
        </div>
        <div className="border-b border-slate-700" aria-hidden />
      </header>

      {games.length === 0 ? (
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-10 text-center sm:px-8">
          <p className="font-body text-base font-medium text-white">Your game film starts here.</p>
          <p className="mt-2 font-body text-sm text-slate-500">
            Log your first game to start tracking plays and building tendencies.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/film/new" className="btn-primary text-sm">
              + New Game
            </Link>
            <Link href="/film/import" className="btn-primary text-sm">
              Import from CSV
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {games.map((game) => <FilmGameCard key={game.id} game={game} />)}
        </ul>
      )}
    </section>
  );
}
