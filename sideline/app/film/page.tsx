import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LoggedPlayRef = { id: string };
type DriveWithPlays = { id: string; logged_plays: LoggedPlayRef[] | null };
type GameSessionRow = {
  id: string;
  my_playbook: string;
  opponent_team: string;
  my_score: number | null;
  opponent_score: number | null;
  result: "W" | "L" | null;
  game_date: string;
  created_at: string;
  drives: DriveWithPlays[] | null;
};

type GameWithCounts = GameSessionRow & { driveCount: number; playCount: number };

function formatDate(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(y, m - 1, d));
}

async function getGamesWithCounts(): Promise<GameWithCounts[]> {
  const { data: games, error } = await supabase
    .from("game_sessions")
    .select(
      `
    id,
    my_playbook,
    opponent_team,
    my_score,
    opponent_score,
    result,
    game_date,
    created_at,
    drives (
      id,
      logged_plays (id)
    )
  `,
    )
    .order("created_at", { ascending: false });

  if (error || !games) return [];

  return (games as GameSessionRow[]).map((game) => {
    const drives = game.drives ?? [];
    const driveCount = drives.length;
    const playCount = drives.reduce((sum, d) => sum + (d.logged_plays?.length ?? 0), 0);
    return { ...game, driveCount, playCount };
  });
}

export default async function FilmRoomPage() {
  const games = await getGamesWithCounts();

  const addDriveButtonClass = "rounded bg-emerald-500 px-3 py-2 text-slate-950";

  return (
    <section className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl tracking-wide text-white sm:text-4xl">FILM ROOM</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/film/new"
            className="group block rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-emerald-600/60 hover:bg-slate-800/80"
          >
            <p className="font-display text-lg text-white">New Game</p>
            <p className="mt-1 text-sm text-slate-400">Start a live sideline logging session.</p>
          </Link>
          <Link
            href="/film/import"
            className="group block rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-emerald-600/60 hover:bg-slate-800/80"
          >
            <p className="font-display text-lg text-white">Import from CSV</p>
            <p className="mt-1 text-sm text-slate-400">Upload completed drive and play data from a CSV file.</p>
          </Link>
        </div>
        <div className="border-b border-slate-700" aria-hidden />
      </header>

      {games.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-10 text-center">
          <p className="text-slate-300">No games logged yet.</p>
          <p className="mt-1 text-sm text-slate-400">Start a live game, or import one from CSV.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/film/new" className={`inline-flex items-center justify-center text-sm font-semibold ${addDriveButtonClass}`}>
              + New Game
            </Link>
            <Link href="/film/import" className={`inline-flex items-center justify-center text-sm font-semibold ${addDriveButtonClass}`}>
              + Import from CSV
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/film/${game.id}`}
                className="block rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-600 hover:bg-slate-750"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg leading-tight text-slate-100">
                      {game.my_playbook}
                      <span className="mx-2 text-slate-500">vs</span>
                      {game.opponent_team}
                    </p>
                  </div>
                  {game.result === "W" ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-700 bg-emerald-900/40 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      W
                    </span>
                  ) : null}
                  {game.result === "L" ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-red-700 bg-red-900/40 px-2.5 py-1 text-xs font-bold text-red-400">
                      L
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-slate-100">
                    {game.my_score ?? "—"} – {game.opponent_score ?? "—"}
                  </span>
                  <time className="text-xs text-slate-500" dateTime={game.game_date}>
                    {formatDate(game.game_date)}
                  </time>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span>
                    {game.driveCount} {game.driveCount === 1 ? "drive" : "drives"}
                  </span>
                  <span>·</span>
                  <span>
                    {game.playCount} {game.playCount === 1 ? "play" : "plays"}
                  </span>
                  {game.playCount > 0 && game.playCount < 10 ? (
                    <>
                      <span>·</span>
                      <span className="text-amber-400">Partial log</span>
                    </>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
