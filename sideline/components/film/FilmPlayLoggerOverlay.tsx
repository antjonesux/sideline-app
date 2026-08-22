"use client";

import { PlayLoggerV2 } from "@/components/film/PlayLoggerV2";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import {
  appShellBrowsePanelSubtitleClass,
  appShellBrowsePanelTitleClass,
  overlayZ,
} from "@/lib/constants/designTokens";
import { useMdUp } from "@/lib/useMdUp";
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

function LoggerShellHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">Play Logger</h2>
      </div>
      <button
        type="button"
        data-no-press
        className="shrink-0 p-2 -mr-2 text-slate-400 hover:text-white"
        onClick={onClose}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
}

function LoggerBody({
  gameId,
  game,
  activeDrive,
  activeSheetId,
  loggerOpenFlowId,
  totalPlayRowsInGame,
  totalCoachCallsInGame,
  allGameCoachCalls,
  onRefresh,
  onPossessionEndedAfterLog,
}: Omit<FilmPlayLoggerOverlayProps, "open" | "onClose">) {
  return (
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
  );
}

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
  const mdUp = useMdUp();

  if (!open) return null;

  const bodyProps = {
    gameId,
    game,
    activeDrive,
    activeSheetId,
    loggerOpenFlowId,
    totalPlayRowsInGame,
    totalCoachCallsInGame,
    allGameCoachCalls,
    onRefresh,
    onPossessionEndedAfterLog,
  };

  if (mdUp) {
    return (
      <>
        <div className={cn("fixed inset-0 bg-black/60", overlayZ.filmBackdrop)} onClick={onClose} />
        <aside
          className={cn(
            "app-shell-situation-browse-panel fixed inset-y-0 right-0 z-[201] flex min-h-0 min-w-0 flex-col border-l border-slate-800/80 bg-slate-950 shadow-2xl",
          )}
          aria-label="Play Logger"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800/80 bg-slate-950 px-5 py-4">
            <div className="min-w-0">
              <h2 className={cn(appShellBrowsePanelTitleClass, "truncate")}>Play Logger</h2>
              <p className={cn(appShellBrowsePanelSubtitleClass, "truncate")}>
                {game.my_playbook} vs {game.opponent_team}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white"
              onClick={onClose}
              aria-label="Close play logger"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <LoggerBody {...bodyProps} />
          </div>
        </aside>
      </>
    );
  }

  return (
    <ResponsiveOverlay open={open} onClose={onClose} mobileVariant="full-drawer" maxWidth="4xl">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-900">
        <LoggerShellHeader onClose={onClose} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <LoggerBody {...bodyProps} />
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
