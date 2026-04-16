"use client";

import { ResultBadge } from "@/components/import/ResultBadge";
import { DrivePlayTable, DRIVE_PLAY_TABLE_ROW } from "@/components/shared/DrivePlayTable";
import { useState } from "react";

/** Must match parent formation row + expanded play rows (Formation | Plays | Avg yds | Success | chevron). */
const FORMATION_TABLE_GRID =
  "grid w-full grid-cols-[minmax(0,1.4fr)_80px_90px_90px_28px] gap-3 px-4" as const;

type PlayRow = {
  id: string;
  down: number | null;
  distance: number | null;
  formation: string;
  play_name: string;
  yards_gained: number | null;
  result_tag: string;
};

type FormationAgg = {
  formation: string;
  plays: number;
  avg_yards: number;
  success_rate: number;
  play_rows: PlayRow[];
};

type Props = {
  rows: FormationAgg[];
};

export function GameFormationTable({ rows }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) {
    return <p className="font-body text-sm text-slate-500">No formations logged this game.</p>;
  }
  return (
    <div className="app-card overflow-hidden">
      <div className={`${FORMATION_TABLE_GRID} app-accordion-header-row py-3 font-mono text-[11px] font-normal uppercase tracking-wide text-slate-500`}>
        <span>Formation</span>
        <span className="text-right">Plays</span>
        <span className="text-right">Avg yds</span>
        <span className="text-right">Success</span>
        <span aria-hidden />
      </div>
      {rows.map((r) => {
        const isOpen = open === r.formation;
        return (
          <div key={r.formation} className="border-b border-slate-800/90 last:border-0">
            <button
              type="button"
              className={`app-no-press-scale ${FORMATION_TABLE_GRID} py-3 text-left hover:bg-white/[0.02]`}
              onClick={() => setOpen(isOpen ? null : r.formation)}
            >
              <span className="truncate font-body text-[14px] font-normal text-slate-200">{r.formation}</span>
              <span className="font-mono text-right text-[13px] tabular-nums text-slate-300">{r.plays}</span>
              <span className="font-mono text-right text-[13px] tabular-nums text-slate-300">{r.avg_yards}</span>
              <span className="font-mono text-right text-[13px] tabular-nums text-slate-300">{r.success_rate}%</span>
              <span className="inline-flex items-center justify-end">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-800/80 bg-slate-950/40">
                <DrivePlayTable>
                  {r.play_rows.map((p) => {
                    const yds = p.yards_gained ?? 0;
                    const ydsClass = yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                    const ydsText = yds > 0 ? `+${yds}` : String(yds);
                    return (
                      <div key={p.id} className={DRIVE_PLAY_TABLE_ROW}>
                        <span className="font-mono text-[12px] font-normal tabular-nums text-[#A0A3AD]">
                          {p.down ?? "—"}-{p.distance ?? "—"}
                        </span>
                        <span className="min-w-0 truncate font-body text-[13px] font-normal text-[#F5F5F0]">{p.formation}</span>
                        <span className="min-w-0 truncate font-mono text-[12px] font-medium uppercase text-white">
                          {p.play_name}
                        </span>
                        <span className="min-w-0 overflow-hidden">
                          <ResultBadge label={p.result_tag} />
                        </span>
                        <span className={`min-w-0 truncate font-mono text-[13px] font-semibold tabular-nums ${ydsClass}`}>
                          {ydsText}
                        </span>
                      </div>
                    );
                  })}
                </DrivePlayTable>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
