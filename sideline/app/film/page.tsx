import Link from "next/link";
import { getServerOrigin } from "@/lib/serverOrigin";
import type { GameSession } from "@/lib/types";

async function getGames(): Promise<GameSession[]> {
  try {
    const base = getServerOrigin();
    const res = await fetch(`${base}/api/games`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as GameSession[];
  } catch {
    return [];
  }
}

export default async function FilmRoomPage() {
  const games = await getGames();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Film Room</h1>
        <Link href="/film/new" className="rounded bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950">Log New Game</Link>
      </div>
      <div className="space-y-3">
        {games.map((game) => (
          <Link key={game.id} href={`/film/${game.id}`} className="block rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{game.opponent_team} ({game.opponent_scheme})</p>
              <span className={`rounded px-2 py-1 text-xs ${game.result === "W" ? "bg-emerald-700" : "bg-red-700"}`}>{game.result ?? "-"}</span>
            </div>
            <p className="text-sm text-slate-400">{game.game_date} · {game.my_score ?? "-"}-{game.opponent_score ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-300">Drives: {game.drive_count ?? 0} · Plays: {game.play_count ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Log status: {(game.play_count ?? 0) >= 10 && (game.quarter_started_logging ?? 1) === 1 ? "Full log" : "Partial log"}</p>
            {(game.play_count ?? 0) < 10 ? <p className="mt-2 rounded bg-amber-500/20 p-2 text-xs text-amber-300">This looks like a partial log. Incomplete data may affect recommendations.</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
