"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { CardKebabMenu } from "@/components/shared/CardKebabMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { COULDNT_DELETE } from "@/lib/coachCopy";
import { useToastStore } from "@/store/toastStore";
import type { GameSession } from "@/lib/types";

type GameCardData = GameSession & {
  driveCount: number;
  playCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
};

const menuItemClass =
  "flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none";

export function FilmGameCard({
  game,
  defenseLabel,
}: {
  game: GameCardData;
  defenseLabel: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
        addToast(COULDNT_DELETE, "error");
        return;
      }
      setDeleteOpen(false);
      setMenuOpen(false);
      addToast("Game removed.", "success");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  const my = game.my_score;
  const opp = game.opponent_score;
  const myScoreLost = my != null && opp != null && my < opp;
  const myScoreWon = my != null && opp != null && my > opp;
  const myScoreClass = myScoreLost
    ? "text-red-600"
    : myScoreWon
      ? "text-emerald-500"
      : "text-slate-100";

  return (
    <>
      <Link
        href={`/film/${game.id}`}
        className="group block rounded-xl border border-slate-800 bg-slate-900 p-4 pr-14 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] md:rounded-2xl md:px-5 md:py-4 md:pr-16"
      >
        <div className="min-w-0 space-y-2 md:space-y-1.5">
          <h2 className="min-w-0 truncate font-sans text-base font-semibold text-white md:text-[15px] md:leading-tight">
            {game.my_playbook}
            <span className="mx-1.5 font-normal text-slate-500">vs</span>
            {game.opponent_team}
          </h2>

          <p className="font-body text-sm text-slate-500 md:text-[13px]">
            <span className="text-slate-400">Offense:</span>{" "}
            <span className="text-slate-300">{offensivePlaybook}</span>
          </p>

          <p className="font-body text-sm text-slate-500 md:text-[13px]">
            <span className="text-slate-400">Defense:</span>{" "}
            <span className={defenseLabel === "None" ? "text-slate-500" : "text-slate-300"}>{defenseLabel}</span>
          </p>

          <p className="font-mono text-xl font-bold tabular-nums md:text-lg">
            <span className={myScoreClass}>{game.my_score ?? "—"}</span>
            <span className="mx-1.5 text-slate-500">—</span>
            <span className="text-slate-300">{game.opponent_score ?? "—"}</span>
          </p>

          <div className="overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none]">
            <GameStatsInline
              playCount={game.playCount}
              driveCount={game.driveCount}
              totalYards={game.totalYards}
              tds={game.tds}
              turnovers={game.turnovers}
            />
          </div>
        </div>
      </Link>

      <CardKebabMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        ariaLabel="Game actions"
        className="md:top-1/2 md:-translate-y-1/2"
      >
        <DropdownMenuItem className={menuItemClass} onSelect={() => setEditOpen(true)}>
          Edit Game Details
        </DropdownMenuItem>
        <DropdownMenuItem className={`${menuItemClass} text-red-300`} onSelect={() => setDeleteOpen(true)}>
          Delete Game
        </DropdownMenuItem>
      </CardKebabMenu>

      <EditGameDetailsModal
        gameId={game.id}
        game={game}
        onSaved={() => router.refresh()}
        open={editOpen}
        onOpenChange={setEditOpen}
        hideTrigger
      />

      <ConfirmDestructiveModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete game"
        confirmLabel="Delete game"
        message={
          <>
            Removes{" "}
            <strong className="font-semibold text-white">
              {game.my_playbook} vs {game.opponent_team}
            </strong>{" "}
            and all film on file. Can&apos;t be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={confirmDeleteGame}
      />
    </>
  );
}
