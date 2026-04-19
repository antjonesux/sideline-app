"use client";

import { useMemo, useState } from "react";
import { PlayBrowser } from "@/components/film/PlayBrowser";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import { YardageSheet, type PlayResult } from "@/components/film/YardageSheet";
import { usePlaySuggestions } from "@/hooks/usePlaySuggestions";
import { advanceGameState, deriveStoredResultTag, replayGameStateFromPlays, type GameState } from "@/lib/gameStateEngine";
import { formatFieldPosition } from "@/lib/fieldPosition";
import type { Drive, LoggedPlay } from "@/lib/types";
import type { PlaybookEntry } from "@/lib/playbook";
import { useToastStore } from "@/store/toastStore";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { getDrivePossessionOutcome } from "@/lib/driveOutcome";

interface PlayLoggerV2Props {
  gameId: string;
  driveId: string;
  playbook: string;
  drive: Drive;
  initialGameState: GameState;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

function toOrdinal(down: number) {
  if (down === 1) return "1ST";
  if (down === 2) return "2ND";
  if (down === 3) return "3RD";
  return "4TH";
}

export function PlayLoggerV2({ gameId, driveId, playbook, drive, initialGameState, onClose, onRefresh }: PlayLoggerV2Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<PlaybookEntry | null>(null);
  const [optimistic, setOptimistic] = useState<LoggedPlay[]>([]);
  const [flashOk, setFlashOk] = useState(false);

  const logged = drive.plays ?? [];
  const mergedPlays = [...logged, ...optimistic];
  const currentGameState = useMemo(() => replayGameStateFromPlays(mergedPlays, drive.drive_number, drive), [mergedPlays, drive]);

  const { suggestions } = usePlaySuggestions({
    down: currentGameState.down,
    distance: currentGameState.distance,
    fieldPos: currentGameState.absoluteYard,
    gameId,
    playbook,
  });

  async function handleLog(yards: number, result: PlayResult | null) {
    if (!selectedPlay) return;
    const uiTag =
      result === "PUNT"
        ? "PUNT"
        : result === "FIELD_GOAL"
          ? "FIELD_GOAL"
          : result === "FG_MISS"
            ? "TURNOVER"
            : result === "TOUCHDOWN"
              ? "TOUCHDOWN"
              : result === "INCOMPLETE"
                ? "INCOMPLETE"
                : result === "SACK"
                  ? "LOSS"
                  : yards < 0
                    ? "LOSS"
                    : yards === 0
                      ? "NO_GAIN"
                      : "GAIN";

    const storedTag = uiTag === "GAIN" ? deriveStoredResultTag("GAIN", Math.max(0, yards), currentGameState.distance) : uiTag;
    const next = advanceGameState(currentGameState, storedTag, Math.abs(yards));
    const snap = {
      down: currentGameState.down,
      distance: currentGameState.distance,
      is_inches: Boolean(currentGameState.isInches),
      yard_line: currentGameState.absoluteYard <= 50 ? currentGameState.absoluteYard : 100 - currentGameState.absoluteYard,
      side: (currentGameState.absoluteYard <= 50 ? "OWN" : "OPP") as "OWN" | "OPP",
      hash: "MIDDLE" as const,
      formation: selectedPlay.formation,
      play_name: selectedPlay.play_name,
      result_tag: storedTag,
      yards_gained: yards,
      note: null,
      game_session_id: gameId,
      opponent_scheme: "",
      drive_number: drive.drive_number,
      situation_override: null,
    };
    const optimisticPlay: LoggedPlay = {
      id: `optimistic-${Date.now()}`,
      play_number: mergedPlays.length + 1,
      drive_number: drive.drive_number,
      down: snap.down,
      distance: snap.distance,
      is_inches: snap.is_inches,
      yard_line: snap.yard_line,
      side: snap.side,
      hash: snap.hash,
      formation: snap.formation,
      play_name: snap.play_name,
      result_tag: snap.result_tag,
      yards_gained: snap.yards_gained,
    };

    setOptimistic((p) => [...p, optimisticPlay]);
    setSelectedPlay(null);
    setFlashOk(true);
    setTimeout(() => setFlashOk(false), 350);

    const res = await fetch(`/api/drives/${driveId}/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
    });

    if (!res.ok) {
      setOptimistic((p) => p.filter((row) => row.id !== optimisticPlay.id));
      addToast(COULDNT_SAVE, "error");
      return;
    }
    setOptimistic((p) => p.filter((row) => row.id !== optimisticPlay.id));
    await onRefresh();
    void next;
  }

  const stream = [...mergedPlays].slice(-3).reverse();

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2">
        <button type="button" className="min-h-11 px-2 font-sans text-sm text-slate-300" onClick={onClose}>‹ Back</button>
        <p className="font-mono text-xs text-slate-400">Drive {drive.drive_number}</p>
        <button
          type="button"
          className="min-h-11 px-2 font-sans text-sm text-slate-300"
          onClick={() => {
            if ((drive.plays ?? []).length === 0 && !window.confirm("End drive with no plays?")) return;
            const outcome = getDrivePossessionOutcome(drive.plays ?? []);
            void outcome;
            onClose();
          }}
        >
          End Drive
        </button>
      </div>

      <div className={`sticky top-[56px] z-10 flex items-center justify-between border-b border-slate-800 px-3 py-2 ${flashOk ? "bg-emerald-900/30" : "bg-slate-900"}`}>
        <div>
          <p className="font-sans text-xl font-bold text-slate-100">{toOrdinal(currentGameState.down)} & {currentGameState.distance}</p>
          <p className="font-mono text-[10px] uppercase text-slate-500">{formatFieldPosition(currentGameState.absoluteYard)}</p>
        </div>
        <p className="font-mono text-[10px] uppercase text-slate-500">{mergedPlays.length} calls</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-28">
        {stream.length > 0 ? (
          <div className="space-y-2">
            {stream.map((play, idx) => (
              <div key={play.id} className={`rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 ${idx === 1 ? "opacity-60" : idx === 2 ? "opacity-30" : "opacity-100"}`}>
                <div className="flex items-center gap-2">
                  <span className="w-8 font-mono text-[10px] text-slate-500">#{play.play_number}</span>
                  <span className="w-[72px] truncate font-mono text-[10px] text-slate-500">{play.formation}</span>
                  <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-100">{play.play_name}</span>
                  <span className="font-mono text-xs text-slate-400">{play.yards_gained >= 0 ? "+" : ""}{play.yards_gained}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 text-left" onClick={() => setBrowserOpen(true)}>
          <span>
            <span className="block font-sans text-sm text-slate-400">Search plays & formations</span>
            <span className="block font-mono text-[10px] text-slate-500">Browse playbook</span>
          </span>
          <span className="font-mono text-xs text-slate-500">›</span>
        </button>

        <section>
          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">You&apos;ve been calling…</p>
          <p className="mt-1 font-sans text-[11px] text-slate-400">Based on {toOrdinal(currentGameState.down)} & {currentGameState.distance} at {formatFieldPosition(currentGameState.absoluteYard)}</p>
          <div className="mt-2 space-y-2">
            {suggestions.map((play) => (
              <PlayRow key={play.play_id} play={play} onSelect={(picked) => setSelectedPlay(picked)} />
            ))}
          </div>
        </section>
      </div>

      {browserOpen ? (
        <PlayBrowser
          playbook={playbook}
          onClose={() => setBrowserOpen(false)}
          onSelect={(play) => {
            setBrowserOpen(false);
            setSelectedPlay(play);
          }}
        />
      ) : null}

      {selectedPlay ? (
        <YardageSheet
          play={selectedPlay}
          currentGameState={currentGameState}
          onCancel={() => setSelectedPlay(null)}
          onLog={handleLog}
        />
      ) : null}
    </div>
  );
}
