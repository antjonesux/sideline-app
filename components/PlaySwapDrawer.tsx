"use client";

import { useEffect, useMemo, useState } from "react";

type PlayOpt = {
  play_name: string;
  play_type: string | null;
  is_new_in_26: boolean;
};

export function PlaySwapDrawer({
  open,
  onClose,
  playbook,
  defensiveScheme,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  playbook: string;
  defensiveScheme: string;
  onSelect: (pick: {
    formation: string;
    play_name: string;
    play_type: string | null;
  }) => void;
}) {
  const [formations, setFormations] = useState<string[]>([]);
  const [formation, setFormation] = useState<string | null>(null);
  const [plays, setPlays] = useState<PlayOpt[]>([]);
  const [qForm, setQForm] = useState("");
  const [qPlay, setQPlay] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormation(null);
    setPlays([]);
    setQForm("");
    setQPlay("");
    const ac = new AbortController();
    fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}`, {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((j) => setFormations(j.formations ?? []))
      .catch(() => setFormations([]));
    return () => ac.abort();
  }, [open, playbook]);

  useEffect(() => {
    if (!open || !formation) {
      setPlays([]);
      return;
    }
    const ac = new AbortController();
    fetch(
      `/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&formation=${encodeURIComponent(formation)}`,
      { signal: ac.signal },
    )
      .then((r) => r.json())
      .then((j) => setPlays(j.plays ?? []))
      .catch(() => setPlays([]));
    return () => ac.abort();
  }, [open, playbook, formation]);

  const filteredFormations = useMemo(() => {
    const t = qForm.trim().toLowerCase();
    if (!t) return formations;
    return formations.filter((f) => f.toLowerCase().includes(t));
  }, [formations, qForm]);

  const filteredPlays = useMemo(() => {
    const t = qPlay.trim().toLowerCase();
    if (!t) return plays;
    return plays.filter((p) => p.play_name.toLowerCase().includes(t));
  }, [plays, qPlay]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close picker"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl border border-white/15 bg-[var(--bg)] shadow-2xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-lg text-[var(--chalk)]">
            Swap play
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[var(--chalk-muted)] hover:text-[var(--chalk)]"
          >
            Close
          </button>
        </div>
        <p className="px-4 pt-2 font-mono text-[10px] text-[var(--chalk-muted)]">
          vs {defensiveScheme} · {playbook}
        </p>
        <div className="grid flex-1 gap-0 overflow-hidden sm:grid-cols-2">
          <div className="flex min-h-[200px] flex-col border-b border-white/10 sm:border-b-0 sm:border-r">
            <input
              type="search"
              placeholder="Filter formations…"
              value={qForm}
              onChange={(e) => setQForm(e.target.value)}
              className="border-b border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--chalk)] placeholder:text-[var(--chalk-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <ul className="flex-1 overflow-y-auto">
              {filteredFormations.map((f) => (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => setFormation(f)}
                    className={`w-full px-3 py-2.5 text-left font-mono text-xs transition ${
                      formation === f
                        ? "bg-[var(--accent)]/20 text-[var(--accent-soft)]"
                        : "text-[var(--chalk-soft)] hover:bg-white/5"
                    }`}
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-h-[200px] flex-col">
            <input
              type="search"
              placeholder="Filter plays…"
              value={qPlay}
              onChange={(e) => setQPlay(e.target.value)}
              disabled={!formation}
              className="border-b border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--chalk)] placeholder:text-[var(--chalk-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-40"
            />
            <ul className="flex-1 overflow-y-auto">
              {formation
                ? filteredPlays.map((p) => (
                    <li key={p.play_name}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect({
                            formation,
                            play_name: p.play_name,
                            play_type: p.play_type,
                          });
                          onClose();
                        }}
                        className="flex w-full flex-col items-start px-3 py-2.5 text-left font-mono text-xs text-[var(--chalk-soft)] hover:bg-white/5"
                      >
                        <span className="text-[var(--chalk)]">{p.play_name}</span>
                        {p.play_type ? (
                          <span className="mt-0.5 text-[10px] text-[var(--chalk-muted)]">
                            {p.play_type}
                            {p.is_new_in_26 ? " · CFB26" : ""}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                : null}
              {formation && filteredPlays.length === 0 ? (
                <li className="px-3 py-4 font-mono text-xs text-[var(--chalk-muted)]">
                  No plays match.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
