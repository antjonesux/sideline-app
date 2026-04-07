"use client";

import { useEffect, useState } from "react";

const COVERAGE = [
  "Cover 0",
  "Cover 1",
  "Cover 2",
  "Cover 3",
  "Cover 4",
  "Mix",
] as const;
const BLITZ = ["Never", "Occasional", "Heavy"] as const;
const RUN = ["Soft", "Base", "Aggressive"] as const;

export function primaryCoverageToTag(s: string): string {
  const t = s.trim();
  if (/^cover\s+/i.test(t)) return t.replace(/^cover\s+/i, "COVER ");
  const u = t.toUpperCase();
  if (u === "MIX") return "MIX";
  return u.replace(/\s+/g, " ");
}

export function PreGameNotesForm({
  draftStorageKey,
  sessionId,
  onSaved,
}: {
  draftStorageKey: string;
  sessionId: string | null;
  onSaved?: () => void;
}) {
  const [primary, setPrimary] = useState("Cover 3");
  const [blitz, setBlitz] = useState("Occasional");
  const [runStop, setRunStop] = useState("Base");
  const [defender, setDefender] = useState("");
  const [focus, setFocus] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const j = JSON.parse(raw) as Record<string, string>;
        if (j.primary) setPrimary(j.primary);
        if (j.blitz) setBlitz(j.blitz);
        if (j.runStop) setRunStop(j.runStop);
        if (j.defender) setDefender(j.defender);
        if (j.focus) setFocus(j.focus);
      }
    } catch {
      /* ignore */
    }
  }, [draftStorageKey]);

  const persistLocal = () => {
    localStorage.setItem(
      draftStorageKey,
      JSON.stringify({ primary, blitz, runStop, defender, focus }),
    );
  };

  const save = async () => {
    persistLocal();
    if (sessionId && !sessionId.startsWith("local-")) {
      await fetch("/api/pregame-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_session_id: sessionId,
          primary_coverage: primary,
          blitz_frequency: blitz,
          run_stop_tendency: runStop,
          key_defender: defender,
          game_plan_focus: focus,
        }),
      });
    }
    onSaved?.();
  };

  return (
    <div className="rounded-xl border border-white/15 bg-black/35 p-4">
      <h3 className="font-display text-lg text-[var(--chalk)]">
        Pre-game scouting
      </h3>
      <p className="mt-1 font-mono text-[11px] text-[var(--chalk-muted)]">
        Saved locally; syncs to this game session when connected.
      </p>
      <div className="mt-4 grid gap-3 font-mono text-xs">
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">Primary coverage</span>
          <select
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-2 py-2 text-[var(--chalk)]"
          >
            {COVERAGE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">Blitz frequency</span>
          <select
            value={blitz}
            onChange={(e) => setBlitz(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-2 py-2 text-[var(--chalk)]"
          >
            {BLITZ.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">Run stop tendency</span>
          <select
            value={runStop}
            onChange={(e) => setRunStop(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-2 py-2 text-[var(--chalk)]"
          >
            {RUN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">
            Key defender (40 chars)
          </span>
          <input
            value={defender}
            maxLength={40}
            onChange={(e) => setDefender(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-2 py-2 text-[var(--chalk)]"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--chalk-muted)]">
            Game plan focus (80 chars)
          </span>
          <input
            value={focus}
            maxLength={80}
            onChange={(e) => setFocus(e.target.value)}
            className="rounded border border-white/15 bg-black/50 px-2 py-2 text-[var(--chalk)]"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="mt-4 rounded border border-[var(--accent)]/50 px-4 py-2 font-mono text-xs text-[var(--accent-soft)]"
      >
        Save pre-game notes
      </button>
    </div>
  );
}

export function readPregameDraft(key: string): {
  primary_coverage: string;
  blitz_frequency: string;
  run_stop_tendency: string;
  key_defender: string | null;
  game_plan_focus: string | null;
} | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, string>;
    return {
      primary_coverage: j.primary ?? "Cover 3",
      blitz_frequency: j.blitz ?? "Occasional",
      run_stop_tendency: j.runStop ?? "Base",
      key_defender: j.defender || null,
      game_plan_focus: j.focus || null,
    };
  } catch {
    return null;
  }
}
