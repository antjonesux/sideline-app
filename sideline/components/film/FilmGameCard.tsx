"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import type { GameSession } from "@/lib/types";

type GameCardData = GameSession & {
  driveCount: number;
  playCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
};

export function FilmGameCard({ game }: { game: GameCardData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const offensivePlaybook = useMemo(() => {
    const fallback = game.my_playbook?.trim() ? game.my_playbook : "—";
    const offensive = game.offensive_playbook?.trim();
    return offensive && offensive.length > 0 ? offensive : fallback;
  }, [game.my_playbook, game.offensive_playbook]);

  async function deleteGame() {
    const ok = window.confirm("Delete this game and all of its drives/plays?");
    if (!ok) return;
    const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Could not delete game.");
      return;
    }
    setMenuOpen(false);
    router.refresh();
  }

  const myScoreClass = game.result === "W" ? "text-[#10B981]" : game.result === "L" ? "text-[#C0392B]" : "text-slate-100";

  return (
    <li className="relative">
      <Link href={`/film/${game.id}`} className="app-card-interactive block hover:border-slate-600">
        <div className="flex items-start justify-between gap-2 pr-12">
          <div>
            <p className="app-game-title leading-tight">
              {game.my_playbook}
              <span className="mx-2 font-body font-normal text-slate-500">vs</span>
              {game.opponent_team}
            </p>
          </div>
        </div>

        <div className="mt-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            <span className="font-body">Offense Used:</span> <span className="font-mono text-slate-300">{offensivePlaybook}</span>
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-2xl font-bold tabular-nums">
            <span className={myScoreClass}>{game.my_score ?? "—"}</span>
            <span className="mx-1.5 text-slate-500">—</span>
            <span className="text-slate-300">{game.opponent_score ?? "—"}</span>
          </span>
        </div>

        <div className="mt-2 overflow-x-auto">
          <GameStatsInline playCount={game.playCount} driveCount={game.driveCount} totalYards={game.totalYards} tds={game.tds} turnovers={game.turnovers} />
        </div>
      </Link>

      <div className="absolute right-3 top-3 z-10">
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Game actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
          {menuOpen ? (
            <ul className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-slate-700 bg-slate-950 py-1 text-sm shadow-lg" role="menu">
              <li>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <EditGameDetailsModal gameId={game.id} game={game} onSaved={() => router.refresh()} triggerClassName="block w-full px-3 py-2 text-left font-barlow text-slate-200 hover:bg-slate-800" triggerLabel="Edit Game Details" />
                </div>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left font-barlow text-red-300 hover:bg-slate-800"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void deleteGame();
                  }}
                >
                  Delete Game
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}
