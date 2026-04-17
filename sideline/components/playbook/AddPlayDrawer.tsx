"use client";

import { FormationPlaySearch, type FormationPlayResultRow } from "@/components/shared/FormationPlaySearch";
import { dedupePlaysByDisplayInFormation } from "@/lib/normalizePlayLabel";
import { useScrollLock } from "@/lib/useScrollLock";
import { useEffect, useState } from "react";

type Stats = { uses: number; avg_yards: number; success_rate: number };
type FormationAgg = { uses: number; success_rate: number };

type PlayRow = {
  formation: string;
  play_name: string;
  formation_type: string | null;
  is_new_in_26: boolean | null;
};

/** Dedupe by canonical play name within each formation (spacing / `0 1` vs `01` / hidden Unicode variants). */
function dedupeRows(rows: PlayRow[]): PlayRow[] {
  const byFormation = new Map<string, PlayRow[]>();
  for (const row of rows) {
    const f = row.formation?.trim() || "Other";
    if (!byFormation.has(f)) byFormation.set(f, []);
    byFormation.get(f)!.push({ ...row, formation: f });
  }
  const out: PlayRow[] = [];
  for (const [f, list] of byFormation) {
    out.push(...dedupePlaysByDisplayInFormation(list, f));
  }
  out.sort((a, b) => {
    const fc = a.formation.localeCompare(b.formation);
    if (fc !== 0) return fc;
    return a.play_name.localeCompare(b.play_name);
  });
  return out;
}

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
  useScrollLock(open);
  const [allRows, setAllRows] = useState<FormationPlayResultRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setAllRows([]);
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(cfb26Playbook)}&list=all`, {
          cache: "no-store",
        });
        const j = (await res.json()) as { rows?: PlayRow[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadErr(j.error ?? "Could not load plays");
          return;
        }
        if (!cancelled) setAllRows(dedupeRows(j.rows ?? []));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cfb26Playbook]);

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
        className="hs-overlay-animation-target pointer-events-auto fixed inset-0 z-[61] flex flex-col sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[85vh] sm:rounded-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-white">Add play</h2>
              <p className="app-field-label mt-0.5">{scenarioName}</p>
            </div>
            <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={onClose}>
              <span aria-hidden>✕</span>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {loadErr ? (
            <p className="p-4 font-body text-sm text-amber-200">{loadErr}</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
              <FormationPlaySearch
                resultsLayout="stacked"
                dataSource={{ type: "local", plays: allRows, loading }}
                value={null}
                onChange={(v) => {
                  if (v) {
                    onPick(v.formation, v.play_name);
                    onClose();
                  }
                }}
                scenarioStats={scenarioStats}
                formationStats={formationStats}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
