"use client";

import { ResultBadge } from "@/components/import/ResultBadge";
import { useState } from "react";

type PlayRow = {
  id: string;
  down: number;
  distance: number;
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
      <div className="grid grid-cols-[minmax(0,1.4fr)_80px_90px_90px_28px] gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 font-mono text-[11px] font-normal uppercase tracking-wide text-slate-500">
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
              className="grid w-full grid-cols-[minmax(0,1.4fr)_80px_90px_90px_28px] gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
              onClick={() => setOpen(isOpen ? null : r.formation)}
            >
              <span className="truncate font-barlow text-[14px] font-normal text-slate-200">{r.formation}</span>
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
              <div className="border-t border-slate-800/80 bg-slate-950/40 px-3 py-1.5">
                <div className="grid grid-cols-[minmax(0,1.3fr)_88px_88px] gap-3 border-b border-white/[0.05] px-1 py-1.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  <span className="text-left">Play</span>
                  <span className="text-right">Avg Yds</span>
                  <span className="text-right">Success</span>
                </div>
                {r.play_rows.map((p) => {
                  const yds = p.yards_gained ?? 0;
                  const ydsClass = yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                  const ydsText = yds > 0 ? `+${yds}` : String(yds);
                  const isSuccess = p.result_tag === "TOUCHDOWN" || p.result_tag === "FIRST_DOWN";
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[minmax(0,1.3fr)_88px_88px] gap-3 border-b border-white/[0.04] px-1 py-2 last:border-0"
                    >
                      <div className="min-w-0 text-left">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="font-mono shrink-0 text-[12px] tabular-nums text-[#A0A3AD]">
                            {p.down}-{p.distance}
                          </span>
                          <span className="font-barlow min-w-0 truncate text-[13px] text-[#F5F5F0]">{p.play_name}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-barlow text-[11px] text-slate-500">{p.formation}</span>
                          <ResultBadge label={p.result_tag} />
                        </div>
                      </div>
                      <span className={`font-mono text-right text-[12px] font-semibold tabular-nums ${ydsClass}`}>{ydsText}</span>
                      <span className="font-mono text-right text-[12px] tabular-nums text-slate-300">{isSuccess ? "100%" : "0%"}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
