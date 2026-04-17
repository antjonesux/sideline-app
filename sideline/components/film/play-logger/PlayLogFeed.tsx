"use client";

import { useMemo, useState } from "react";
import type { LoggedPlay } from "@/lib/types";
import { normalizePlayName } from "@/lib/utils";
import { PlayLogFeedRow } from "@/components/film/play-logger/PlayLogFeedRow";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";

type PlayLogFeedProps = {
  plays: LoggedPlay[];
  driveNumber: number;
  onSelectPlay: (play: LoggedPlay) => void;
  onDeletePlay: (play: LoggedPlay) => Promise<void>;
};

export function PlayLogFeed({ plays, driveNumber, onSelectPlay, onDeletePlay }: PlayLogFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LoggedPlay | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...plays].sort((a, b) => (a.play_number ?? 0) - (b.play_number ?? 0)),
    [plays],
  );

  const tail = useMemo(() => {
    if (showAll || sorted.length <= 5) return sorted;
    return sorted.slice(-5);
  }, [sorted, showAll]);

  if (sorted.length === 0) {
    return (
      <div className="app-card app-card-pad rounded-xl border border-slate-700 bg-slate-900">
        <p className="text-center font-sans text-sm text-slate-400">
          No plays logged yet.
          <br />
          Search for a formation and play above to start tracking.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="group rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <div className="max-h-64 overflow-y-auto overflow-x-auto sm:max-h-none">
          {tail.map((p, i) => {
            const prev = i > 0 ? tail[i - 1] : null;
            const prevDn = prev ? (prev.drive_number ?? driveNumber) : null;
            const dn = p.drive_number ?? driveNumber;
            const showRule = prev != null && prevDn !== dn;
            return (
              <PlayLogFeedRow
                key={p.id}
                play={p}
                driveFallback={driveNumber}
                showDriveRule={showRule}
                onSelect={() => onSelectPlay(p)}
                onDelete={() => setPendingDelete(p)}
              />
            );
          })}
        </div>
        {sorted.length > 5 ? (
          <button
            type="button"
            className="mt-3 font-sans text-sm font-medium text-emerald-400 hover:text-emerald-300"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Show fewer" : `Show all (${sorted.length} plays)`}
          </button>
        ) : null}
      </div>

      <ConfirmDestructiveModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this play?"
        message={
          pendingDelete ? (
            <>
              Remove{" "}
              <span className="font-mono text-white">
                {pendingDelete.formation} → {normalizePlayName(pendingDelete.play_name)}
              </span>{" "}
              from this drive?
            </>
          ) : null
        }
        busy={busy}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setBusy(true);
          try {
            await onDeletePlay(pendingDelete);
            setPendingDelete(null);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
