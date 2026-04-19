"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayBrowser } from "@/components/film/PlayBrowser";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import { YardageSheet, type PlayResult } from "@/components/film/YardageSheet";
import { usePlaySuggestions } from "@/hooks/usePlaySuggestions";
import { deriveStoredResultTag, replayGameStateFromPlays } from "@/lib/gameStateEngine";
import { formatFieldPosition } from "@/lib/fieldPosition";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import type { Drive, LoggedPlay } from "@/lib/types";
import type { PlaybookEntry } from "@/lib/playbook";
import { useToastStore } from "@/store/toastStore";
import { COULDNT_SAVE } from "@/lib/coachCopy";

interface PlayLoggerV2Props {
  gameId: string;
  driveId: string;
  playbook: string;
  drive: Drive;
  onRefresh: () => Promise<void>;
}

export function PlayLoggerV2({ gameId, driveId, playbook, drive, onRefresh }: PlayLoggerV2Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<PlaybookEntry | null>(null);
  const [optimistic, setOptimistic] = useState<LoggedPlay[]>([]);
  const [flashOk, setFlashOk] = useState(false);
  const [accordionExpanded, setAccordionExpanded] = useState(false);
  const [locallyHiddenPlayIds, setLocallyHiddenPlayIds] = useState<Set<string>>(() => new Set());
  const [pendingDeletePlayId, setPendingDeletePlayId] = useState<string | null>(null);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    return () => {
      void onRefreshRef.current();
      // TODO: QA18 — When `drives` exposes a persisted outcome + PUT accepts it, write
      // `deriveDriveResult(lastLoggedPlay)` here instead of refresh-only.
    };
  }, [driveId]);

  const loggedVisible = useMemo(
    () => (drive.plays ?? []).filter((p) => !locallyHiddenPlayIds.has(p.id)),
    [drive.plays, locallyHiddenPlayIds],
  );

  const mergedPlays = useMemo(() => {
    const combined = [...loggedVisible, ...optimistic];
    return combined.sort((a, b) => (a.play_number ?? 0) - (b.play_number ?? 0));
  }, [loggedVisible, optimistic]);

  const currentGameState = useMemo(
    () => replayGameStateFromPlays(mergedPlays, drive.drive_number, drive),
    [mergedPlays, drive],
  );

  const { suggestions } = usePlaySuggestions({
    down: currentGameState.down,
    distance: currentGameState.distance,
    fieldPos: currentGameState.absoluteYard,
    gameId,
    playbook,
  });

  const streamPlaysDesc = useMemo(
    () => [...mergedPlays].sort((a, b) => (b.play_number ?? 0) - (a.play_number ?? 0)),
    [mergedPlays],
  );

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
  }

  async function handleConfirmDeletePlay(play: LoggedPlay) {
    setPendingDeletePlayId(null);
    if (play.id.startsWith("optimistic-")) {
      setOptimistic((o) => o.filter((x) => x.id !== play.id));
      return;
    }
    setLocallyHiddenPlayIds((prev) => new Set(prev).add(play.id));
    const res = await fetch(`/api/plays/${play.id}`, { method: "DELETE" });
    if (!res.ok) {
      setLocallyHiddenPlayIds((prev) => {
        const next = new Set(prev);
        next.delete(play.id);
        return next;
      });
      addToast(COULDNT_SAVE, "error");
      return;
    }
    await onRefresh();
    setLocallyHiddenPlayIds((prev) => {
      const next = new Set(prev);
      next.delete(play.id);
      return next;
    });
    addToast("Call removed.", "success");
  }

  const situationLine = formatDownDistanceLabel(currentGameState.down, currentGameState.distance, {
    isGoalToGo: false,
    yardLine: currentGameState.absoluteYard,
    isInches: currentGameState.isInches,
  });
  const fieldLine = formatFieldPosition(currentGameState.absoluteYard);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <div
        className={`sticky top-0 z-10 -mx-3 border-b border-slate-700 ${flashOk ? "bg-emerald-900/30" : "bg-slate-900"}`}
      >
        <div className="flex w-full items-center gap-3 px-4 py-3">
          <span className="whitespace-nowrap font-mono text-[13px] font-semibold uppercase tracking-widest text-amber-400">
            DRIVE {drive.drive_number}
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="font-sans text-lg font-bold leading-none text-white">{situationLine}</span>
            <span className="font-mono text-xs text-slate-400">· {fieldLine}</span>
          </div>

          <button
            type="button"
            className="app-no-press-scale flex min-h-11 shrink-0 items-center gap-1 text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={() => setAccordionExpanded((e) => !e)}
            aria-expanded={accordionExpanded}
          >
            <span className="font-mono text-xs font-medium uppercase tracking-widest">
              {mergedPlays.length} {mergedPlays.length === 1 ? "CALL" : "CALLS"}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${accordionExpanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {accordionExpanded && streamPlaysDesc.length > 0 ? (
          <div className="max-h-48 overflow-y-auto border-t border-slate-800/80 px-4 pb-3 pt-0">
            <div className="space-y-2">
              {streamPlaysDesc.map((play, idx) => (
                <div
                  key={play.id}
                  className={idx === 0 ? "motion-safe:animate-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200" : ""}
                >
                  <PlayRow
                    variant="stream"
                    play={play}
                    streamIndex={idx}
                    isConfirmingDelete={pendingDeletePlayId === play.id}
                    onDeletePress={() => setPendingDeletePlayId(play.id)}
                    onConfirmDelete={() => void handleConfirmDeletePlay(play)}
                    onCancelDelete={() => setPendingDeletePlayId(null)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pt-0 pb-28">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 text-left"
          onClick={() => setBrowserOpen(true)}
        >
          <span>
            <span className="block font-sans text-sm text-slate-400">Search plays & formations</span>
            <span className="block font-mono text-[10px] text-slate-500">Browse playbook</span>
          </span>
          <span className="font-mono text-xs text-slate-500">›</span>
        </button>

        <section>
          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">You&apos;ve been calling…</p>
          <p className="mt-1 font-sans text-[11px] text-slate-400">
            Based on {situationLine} at {fieldLine}
          </p>
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
