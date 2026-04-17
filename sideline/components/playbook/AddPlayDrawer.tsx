"use client";

import { comboKey } from "@/lib/loggedPlayStats";
import { useCallback, useEffect, useMemo, useState } from "react";

type FormationGroup = { formation_type: string; formations: string[] };
type Stats = { uses: number; avg_yards: number; success_rate: number };
type FormationAgg = { uses: number; success_rate: number };

export function AddPlayDrawer({
  open,
  onClose,
  cfb26Playbook,
  scenarioName,
  scenarioStats,
  formationStats,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  cfb26Playbook: string;
  scenarioName: string;
  scenarioStats: Record<string, Stats>;
  formationStats: Record<string, FormationAgg>;
  onPick: (formation: string, playName: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [groups, setGroups] = useState<FormationGroup[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [formationSearch, setFormationSearch] = useState("");
  const [playSearch, setPlaySearch] = useState("");
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);
  const [plays, setPlays] = useState<{ play_name: string; is_new_in_26?: boolean | null }[]>([]);
  const [playsLoading, setPlaysLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedFormation(null);
      setFormationSearch("");
      setPlaySearch("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadErr(null);
      const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(cfb26Playbook)}`);
      const j = (await res.json()) as { groups?: FormationGroup[]; error?: string };
      if (!res.ok) {
        if (!cancelled) setLoadErr(j.error ?? "Could not load formations");
        return;
      }
      if (!cancelled) setGroups(j.groups ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cfb26Playbook]);

  const loadPlays = useCallback(
    async (formation: string) => {
      setPlaysLoading(true);
      try {
        const res = await fetch(
          `/api/cfb26-plays?playbook=${encodeURIComponent(cfb26Playbook)}&formation=${encodeURIComponent(formation)}`,
        );
        const j = (await res.json()) as { plays?: { play_name: string; is_new_in_26?: boolean | null }[]; error?: string };
        if (!res.ok) {
          setPlays([]);
          setLoadErr(j.error ?? "Could not load plays");
          return;
        }
        setPlays(j.plays ?? []);
      } finally {
        setPlaysLoading(false);
      }
    },
    [cfb26Playbook],
  );

  useEffect(() => {
    if (step === 2 && selectedFormation) void loadPlays(selectedFormation);
  }, [step, selectedFormation, loadPlays]);

  const filteredGroups = useMemo(() => {
    const q = formationSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        formations: g.formations.filter((f) => f.toLowerCase().includes(q) || g.formation_type.toLowerCase().includes(q)),
      }))
      .filter((g) => g.formations.length > 0);
  }, [groups, formationSearch]);

  const filteredPlays = useMemo(() => {
    const q = playSearch.trim().toLowerCase();
    if (!q) return plays;
    return plays.filter((p) => p.play_name.toLowerCase().includes(q));
  }, [plays, playSearch]);

  if (!open) return null;

  return (
    <div
      className="hs-overlay pointer-events-auto fixed inset-0 z-[60] bg-black/70"
      role="dialog"
      aria-modal
      aria-label="Add play"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="hs-overlay-animation-target pointer-events-auto absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-white">
              {step === 1 ? "Pick formation" : `Plays — ${selectedFormation}`}
            </h2>
            <p className="app-field-label mt-0.5">{scenarioName}</p>
          </div>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        {loadErr ? (
          <p className="p-4 font-body text-sm text-amber-200">{loadErr}</p>
        ) : step === 1 ? (
          <div className="flex max-h-[calc(88vh-3.5rem)] flex-col">
            <div className="border-b border-slate-800 p-3">
              <input
                className="hs-input app-input py-2 text-sm text-white placeholder:text-[#A0A3AD]"
                placeholder="Search formations…"
                value={formationSearch}
                onChange={(e) => setFormationSearch(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredGroups.map((g) => (
                <div key={g.formation_type} className="mb-4">
                  <p className="font-heading text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-300">{g.formation_type}</p>
                  <ul className="mt-2 space-y-1">
                    {g.formations.map((f) => {
                      const fs = formationStats[f];
                      const sub =
                        fs && fs.uses > 0 ? (
                          <span className="font-mono text-[11px] font-normal text-[#A0A3AD]">
                            {fs.uses} uses
                            <span className="mx-1 text-slate-600">·</span>
                            {fs.success_rate}% success
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-normal text-[#A0A3AD]">No data yet</span>
                        );
                      return (
                        <li key={f}>
                          <button
                            type="button"
                            className="app-card flex w-full items-center justify-between px-3 py-3 text-start transition-colors hover:border-emerald-600/50"
                            onClick={() => {
                              setSelectedFormation(f);
                              setStep(2);
                              setPlaySearch("");
                            }}
                          >
                            <span className="font-body text-[14px] font-normal text-[#F5F5F0]">{f}</span>
                            {sub}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex max-h-[calc(88vh-3.5rem)] flex-col">
            <div className="flex gap-2 border-b border-slate-800 p-3">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setStep(1)}
              >
                Back to formations
              </button>
              <input
                className="hs-input app-input min-w-0 flex-1 py-2 text-sm text-white placeholder:text-[#A0A3AD]"
                placeholder="Search plays…"
                value={playSearch}
                onChange={(e) => setPlaySearch(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {playsLoading ? (
                <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading plays">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="app-skeleton h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredPlays.map((p) => {
                    const ck = selectedFormation ? comboKey(selectedFormation, p.play_name) : "";
                    const st = ck ? scenarioStats[ck] : null;
                    const newBadge = !st || st.uses === 0;
                    return (
                      <li key={p.play_name}>
                        <button
                          type="button"
                          className="app-card flex w-full flex-col items-start px-3 py-2 text-start transition-colors hover:border-emerald-600/50"
                          onClick={() => {
                            if (selectedFormation) onPick(selectedFormation, p.play_name);
                          }}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-mono text-[12px] font-medium uppercase text-white">{p.play_name}</span>
                            {newBadge ? (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-400">
                                New
                              </span>
                            ) : null}
                          </div>
                          {st && st.uses > 0 ? (
                            <span className="mt-1 text-[10px] text-slate-500">
                              <span className="font-mono">{st.uses}</span>
                              <span className="font-body ml-1">uses</span>
                              <span className="mx-1 text-slate-600">·</span>
                              <span className="font-mono">{st.avg_yards.toFixed(1)}</span>
                              <span className="font-body ml-1">yds</span>
                              <span className="mx-1 text-slate-600">·</span>
                              <span className="font-mono">{st.success_rate}%</span>
                            </span>
                          ) : (
                            <span className="mt-1 font-body text-[10px] text-slate-500">No logged data</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
