"use client";

import type { LocalTimelineEvent } from "@/lib/mvp4Types";
import Link from "next/link";
import { useMemo, useState } from "react";

function statsFromEvents(events: LocalTimelineEvent[]) {
  let playsUsed = 0;
  const formationCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const zoneCounts: Record<string, number> = {};

  for (const e of events) {
    if (e.eventType === "play_used" && e.markedUsed) {
      playsUsed += 1;
      if (e.playFormation) {
        formationCounts[e.playFormation] =
          (formationCounts[e.playFormation] ?? 0) + 1;
      }
    }
    if (e.eventType === "coverage_tag") {
      for (const t of e.coverageTags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
    }
    if (e.fieldZone) {
      zoneCounts[e.fieldZone] = (zoneCounts[e.fieldZone] ?? 0) + 1;
    }
  }

  const topFormation = Object.entries(formationCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return { playsUsed, formationCounts, tagCounts, zoneCounts, topFormation };
}

export function PostGameSummary({
  sessionId,
  events,
  schemeId,
  sheetId,
  defensiveLabel,
}: {
  sessionId: string;
  events: LocalTimelineEvent[];
  schemeId: string;
  sheetId: string;
  defensiveLabel: string;
}) {
  const stats = useMemo(() => statsFromEvents(events), [events]);
  const [result, setResult] = useState<"W" | "L" | "">("");
  const [score, setScore] = useState("");
  const [worked, setWorked] = useState("");
  const [adjust, setAdjust] = useState("");
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (sessionId.startsWith("local-")) {
      setDone(true);
      return;
    }
    await fetch(`/api/game-sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ended: true,
        result: result || null,
        score: score || null,
        what_worked: worked || null,
        what_to_adjust: adjust || null,
        rating: rating || null,
      }),
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-display text-xl text-[var(--chalk)]">Game saved.</p>
        <Link
          href={`/scheme/${schemeId}/playsheet/${sheetId}`}
          className="mt-6 inline-block font-mono text-sm text-[var(--accent-soft)]"
        >
          ← Back to play sheet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-10">
      <h1 className="font-display text-3xl text-[var(--chalk)]">
        Post-game
      </h1>
      <p className="font-mono text-sm text-[var(--chalk-muted)]">
        vs {defensiveLabel}
      </p>

      <section className="rounded-xl border border-white/15 bg-black/35 p-4 font-mono text-sm text-[var(--chalk-soft)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--chalk-muted)]">
          Session stats
        </h2>
        <ul className="mt-3 space-y-2">
          <li>Plays marked used: {stats.playsUsed}</li>
          <li>
            Most used formation:{" "}
            {stats.topFormation ? stats.topFormation[0] : "—"}
          </li>
          <li>
            Coverage tags logged:{" "}
            {Object.keys(stats.tagCounts).length
              ? Object.entries(stats.tagCounts)
                  .map(([k, v]) => `${k} (${v})`)
                  .join(", ")
              : "—"}
          </li>
          <li>
            Field zones (events):{" "}
            {Object.keys(stats.zoneCounts).length
              ? Object.entries(stats.zoneCounts)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")
              : "—"}
          </li>
        </ul>
      </section>

      <section className="space-y-4 font-mono text-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setResult("W")}
            className={`flex-1 rounded border py-3 ${
              result === "W"
                ? "border-[var(--amber)] bg-[var(--amber)]/15"
                : "border-white/15"
            }`}
          >
            W
          </button>
          <button
            type="button"
            onClick={() => setResult("L")}
            className={`flex-1 rounded border py-3 ${
              result === "L"
                ? "border-[var(--amber)] bg-[var(--amber)]/15"
                : "border-white/15"
            }`}
          >
            L
          </button>
        </div>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">Score</span>
          <input
            value={score}
            onChange={(e) => setScore(e.target.value.slice(0, 24))}
            placeholder="35-21"
            className="rounded border border-white/15 bg-black/50 px-3 py-2 text-[var(--chalk)]"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">What worked (150)</span>
          <textarea
            value={worked}
            maxLength={150}
            rows={3}
            onChange={(e) => setWorked(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-3 py-2 text-[var(--chalk)]"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">
            What to adjust (150)
          </span>
          <textarea
            value={adjust}
            maxLength={150}
            rows={3}
            onChange={(e) => setAdjust(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-3 py-2 text-[var(--chalk)]"
          />
        </label>
        <div>
          <span className="text-[var(--chalk-muted)]">Rating</span>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`h-10 w-10 rounded border font-mono ${
                  rating === n
                    ? "border-[var(--amber)] bg-[var(--amber)]/20"
                    : "border-white/15"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void submit()}
        className="w-full rounded border border-[var(--accent)]/50 py-3 font-mono text-sm text-[var(--accent-soft)]"
      >
        Save & end game
      </button>
    </div>
  );
}
