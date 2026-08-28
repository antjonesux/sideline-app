"use client";

import { PlayLoggerV2 } from "@/components/film/PlayLoggerV2";
import { SituationSideRail } from "@/components/shared/SituationSideRail";
import { SituationSideRailOverlay } from "@/components/shared/SituationSideRailOverlay";
import { resolveDriveLoggerContext } from "@/lib/filmGameDetailHelpers";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";

type FilmPlayLoggerOverlayProps = {
  open: boolean;
  layout: "sidebar" | "overlay";
  gameId: string;
  game: GameSession;
  activeDrive: Drive;
  loggerOpenFlowId: string | null;
  totalPlayRowsInGame: number;
  totalCoachCallsInGame: number;
  allGameCoachCalls: LoggedPlay[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onDriveScoreAdjust?: (args: { driveId: string; points: number }) => void | Promise<void>;
  onPossessionEndedAfterLog: (payload: { driveId: string; storedResultTag: string }) => void;
};

function LoggerBody({
  gameId,
  game,
  activeDrive,
  loggerOpenFlowId,
  totalPlayRowsInGame,
  totalCoachCallsInGame,
  allGameCoachCalls,
  onRefresh,
  onDriveScoreAdjust,
  onPossessionEndedAfterLog,
}: Omit<FilmPlayLoggerOverlayProps, "open" | "onClose" | "layout">) {
  const { sheetId, playbook, catalogSideOfBall } = resolveDriveLoggerContext(game, activeDrive);

  return (
    <PlayLoggerV2
      key={`${activeDrive.id}-${catalogSideOfBall}`}
      gameId={gameId}
      driveId={activeDrive.id}
      playbook={playbook}
      drive={activeDrive}
      onRefresh={onRefresh}
      sheetId={sheetId}
      loggerOpenFlowId={loggerOpenFlowId}
      totalPlayRowsInGame={totalPlayRowsInGame}
      totalCoachCallsInGame={totalCoachCallsInGame}
      allGameCoachCalls={allGameCoachCalls}
      catalogGameVersion={game.game_version}
      catalogSideOfBall={catalogSideOfBall}
      onDriveScoreAdjust={onDriveScoreAdjust}
      onPossessionEndedAfterLog={(payload) => onPossessionEndedAfterLog(payload)}
    />
  );
}

export function FilmPlayLoggerOverlay({
  open,
  layout,
  gameId,
  game,
  activeDrive,
  loggerOpenFlowId,
  totalPlayRowsInGame,
  totalCoachCallsInGame,
  allGameCoachCalls,
  onClose,
  onRefresh,
  onDriveScoreAdjust,
  onPossessionEndedAfterLog,
}: FilmPlayLoggerOverlayProps) {
  const bodyProps = {
    gameId,
    game,
    activeDrive,
    loggerOpenFlowId,
    totalPlayRowsInGame,
    totalCoachCallsInGame,
    allGameCoachCalls,
    onRefresh,
    onDriveScoreAdjust,
    onPossessionEndedAfterLog,
  };

  const loggerSubtitle = `${game.my_playbook} vs ${game.opponent_team}`;

  const loggerChrome = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <LoggerBody {...bodyProps} />
    </div>
  );

  if (layout === "sidebar") {
    return (
      <SituationSideRail
        open={open}
        title="Play Logger"
        subtitle={loggerSubtitle}
        onClose={onClose}
        closeAriaLabel="Close play logger"
      >
        {loggerChrome}
      </SituationSideRail>
    );
  }

  return (
    <SituationSideRailOverlay
      open={open}
      onClose={onClose}
      title="Play Logger"
      subtitle={loggerSubtitle}
    >
      {loggerChrome}
    </SituationSideRailOverlay>
  );
}
