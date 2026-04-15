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

function PlayRowSeparator() {
  return (
    <span className="shrink-0 px-0.5 text-[12px] leading-none text-[#A0A3AD]/35" aria-hidden>
      →
    </span>
  );
}

export function GameFormationTable({ rows }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) {
    return <p className="font-body text-sm text-slate-500">No formations logged this game.</p>;
  }
  return (
    <div className="app-card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500">
        <span>Formation</span>
        <span className="text-right">Plays</span>
        <span className="text-right">Avg yds</span>
        <span className="text-right">Success</span>
      </div>
      {rows.map((r) => {
        const isOpen = open === r.formation;
        return (
          <div key={r.formation} className="border-b border-slate-800/90 last:border-0">
            <button
              type="button"
              className="grid w-full grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 text-left font-barlow text-sm text-slate-200 hover:bg-white/[0.02]"
              onClick={() => setOpen(isOpen ? null : r.formation)}
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-slate-500">{isOpen ? "▼" : "▶"}</span>
                <span className="truncate">{r.formation}</span>
              </span>
              <span className="font-mono text-right text-[11px] tabular-nums text-slate-400">{r.plays}</span>
              <span className="font-mono text-right text-[11px] tabular-nums text-slate-400">{r.avg_yards}</span>
              <span className="font-mono text-right text-[11px] tabular-nums text-slate-400">{r.success_rate}%</span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-800/80 bg-slate-950/40 px-2 py-1">
                {r.play_rows.map((p) => {
                  const yds = p.yards_gained ?? 0;
                  const ydsClass = yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                  const ydsText = yds > 0 ? `+${yds}` : String(yds);
                  return (
                    <div
                      key={p.id}
                      className="flex min-w-0 items-center gap-1 border-b border-white/[0.04] py-2 last:border-0 sm:gap-1.5"
                    >
                      <span className="font-mono shrink-0 text-[12px] tabular-nums text-[#A0A3AD]">
                        {p.down}-{p.distance}
                      </span>
                      <PlayRowSeparator />
                      <span className="font-barlow min-w-0 max-w-[28%] truncate text-[13px] text-[#F5F5F0]">{p.formation}</span>
                      <PlayRowSeparator />
                      <span className="font-mono min-w-0 max-w-[32%] truncate text-[12px] font-medium uppercase text-white">{p.play_name}</span>
                      <PlayRowSeparator />
                      <ResultBadge label={p.result_tag} />
                      <PlayRowSeparator />
                      <span className={`font-mono min-w-[32px] shrink-0 text-[13px] font-semibold tabular-nums ${ydsClass}`}>{ydsText}</span>
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
