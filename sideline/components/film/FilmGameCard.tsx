"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { useToastStore } from "@/store/toastStore";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const offensivePlaybook = useMemo(() => {
    const fallback = game.my_playbook?.trim() ? game.my_playbook : "—";
    const offensive = game.offensive_playbook?.trim();
    return offensive && offensive.length > 0 ? offensive : fallback;
  }, [game.my_playbook, game.offensive_playbook]);

  async function confirmDeleteGame() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      if (!res.ok) {
        addToast("Failed to save", "error");
        return;
      }
      setDeleteOpen(false);
      setMenuOpen(false);
      addToast("Game deleted", "success");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  const myScoreClass = game.result === "W" ? "text-[#10B981]" : game.result === "L" ? "text-[#C0392B]" : "text-slate-100";

  return (
    <li className="relative">
      <Link href={`/film/${game.id}`} className="app-card-interactive block hover:border-slate-600">
        <div className="flex items-start justify-between gap-2 pr-14">
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

        <div className="app-horizontal-scroll-strip mt-2">
          <GameStatsInline playCount={game.playCount} driveCount={game.driveCount} totalYards={game.totalYards} tds={game.tds} turnovers={game.turnovers} />
        </div>
      </Link>

      <CardKebabMenu open={menuOpen} onOpenChange={setMenuOpen} ariaLabel="Game actions">
        <li>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <EditGameDetailsModal
              gameId={game.id}
              game={game}
              onSaved={() => router.refresh()}
              triggerClassName="app-dropdown-item rounded-none"
              triggerLabel="Edit Game Details"
            />
          </div>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            className="app-dropdown-item-danger rounded-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            Delete Game
          </button>
        </li>
      </CardKebabMenu>

      <ConfirmDestructiveModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete game?"
        message={
          <>
            This will permanently delete{" "}
            <strong className="font-semibold text-white">
              {game.my_playbook} vs {game.opponent_team}
            </strong>{" "}
            and all drives and plays. This can&apos;t be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={confirmDeleteGame}
      />
    </li>
  );
}
