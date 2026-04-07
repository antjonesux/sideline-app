"use client";

import { downLabel, fieldZoneLabel } from "@/lib/gameStateMapping";
import type { FieldZone, LocalTimelineEvent } from "@/lib/mvp4Types";

function distShort(b: string | null): string {
  if (!b) return "";
  if (b === "SHORT") return "SHORT";
  if (b === "MED") return "MED";
  return "LONG";
}

export function GameTimeline({ events }: { events: LocalTimelineEvent[] }) {
  if (!events.length) {
    return (
      <div className="px-4 py-12 text-center font-mono text-sm text-[var(--chalk-muted)]">
        Timeline is empty. Mark plays used or log coverage tags — entries appear
        here automatically.
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-28 pt-4">
      {[...events].reverse().map((e) => {
        const q =
          e.isOt ? "OT" : e.quarter != null ? `Q${e.quarter}` : "—";
        const dz =
          e.down != null && e.distanceBucket
            ? `${downLabel(e.down as 1 | 2 | 3 | 4)} & ${distShort(e.distanceBucket)}`
            : "";
        const fz = e.fieldZone
          ? fieldZoneLabel(e.fieldZone as FieldZone)
          : "";
        const head = [q, fz, dz].filter(Boolean).join(" · ");

        return (
          <div
            key={e.id}
            className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 font-mono text-xs text-[var(--chalk-soft)]"
          >
            <p className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              {head}
            </p>
            {e.eventType === "coverage_tag" && e.coverageTags.length ? (
              <p className="mt-2 text-[var(--accent-soft)]">
                → Tagged: {e.coverageTags.join(", ")}
              </p>
            ) : null}
            {e.eventType === "note" && e.quickNote ? (
              <p className="mt-2 italic text-[var(--chalk)]">
                → Note: &ldquo;{e.quickNote}&rdquo;
              </p>
            ) : null}
            {e.eventType === "play_used" && e.playName ? (
              <p className="mt-2 text-[var(--chalk)]">
                → Called: {e.playFormation} | {e.playName}
                {e.markedUsed ? " ✓ Used" : ""}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
