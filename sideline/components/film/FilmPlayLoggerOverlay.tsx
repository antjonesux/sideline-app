"use client";

import { PlayLoggerV2 } from "@/components/film/PlayLoggerV2";
import { overlayZ, responsiveOverlayInnerCardClass, responsiveOverlayShellPositionClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";

type FilmPlayLoggerOverlayProps = {
  open: boolean;
  gameId: string;
  game: GameSession;
  activeDrive: Drive;
  activeSheetId: string | null;
  loggerOpenFlowId: string | null;
  totalPlayRowsInGame: number;
  totalCoachCallsInGame: number;
  allGameCoachCalls: LoggedPlay[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onPossessionEndedAfterLog: (payload: { driveId: string; storedResultTag: string }) => void;
};

export function FilmPlayLoggerOverlay({
  open,
  gameId,
  game,
  activeDrive,
  activeSheetId,
  loggerOpenFlowId,
  totalPlayRowsInGame,
  totalCoachCallsInGame,
  allGameCoachCalls,
  onClose,
  onRefresh,
  onPossessionEndedAfterLog,
}: FilmPlayLoggerOverlayProps) {
  if (!open) return null;

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/60", overlayZ.filmBackdrop)} onClick={onClose} />
      <div className={cn(responsiveOverlayShellPositionClass("4xl"), overlayZ.filmShell)} onClick={(e) => e.stopPropagation()}>
        <div className={cn(responsiveOverlayInnerCardClass, "bg-slate-900")}>
          <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">Play Logger</h2>
            </div>
            <button type="button" data-no-press className="shrink-0 p-2 -mr-2 text-slate-400 hover:text-white" onClick={onClose}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PlayLoggerV2
              key={activeDrive.id}
              gameId={gameId}
              driveId={activeDrive.id}
              playbook={game.offensive_playbook ?? ""}
              drive={activeDrive}
              onRefresh={onRefresh}
              sheetId={activeSheetId}
              loggerOpenFlowId={loggerOpenFlowId}
              totalPlayRowsInGame={totalPlayRowsInGame}
              totalCoachCallsInGame={totalCoachCallsInGame}
              allGameCoachCalls={allGameCoachCalls}
              onPossessionEndedAfterLog={(payload) => onPossessionEndedAfterLog(payload)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
