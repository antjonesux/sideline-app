"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

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

export function FilmGameCard({ game }: { game: GameCardData }) {
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

  const myScoreClass = game.result === "W" ? "text-emerald-500" : game.result === "L" ? "text-red-600" : "text-slate-100";

  return (
    <li className="relative">
      <Link href={`/film/${game.id}`} className="rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70 block hover:border-slate-600">
        <div className="flex items-start justify-between gap-2 pr-14">
          <div>
            <p className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100 leading-tight">
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

        <div className="overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] mt-2">
          <GameStatsInline playCount={game.playCount} driveCount={game.driveCount} totalYards={game.totalYards} tds={game.tds} turnovers={game.turnovers} />
        </div>
      </Link>

      <CardKebabMenu open={menuOpen} onOpenChange={setMenuOpen} ariaLabel="Game actions">
        <DropdownMenuItem className="flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-slate-200 transition-colors hover:bg-slate-800 rounded-none" onSelect={() => setEditOpen(true)}>
          Edit Game Details
        </DropdownMenuItem>
        <DropdownMenuItem className="flex min-h-11 w-full items-center px-3 py-2 text-left font-body text-sm text-red-300 transition-colors hover:bg-slate-800 rounded-none" onSelect={() => setDeleteOpen(true)}>
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
    </li>
  );
}
