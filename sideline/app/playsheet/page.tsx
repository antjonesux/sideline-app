"use client";

import { useEffect, useMemo, useState } from "react";
import { SCENARIOS, SCENARIO_SHORT } from "@/lib/constants";
import type { PlayStatRow } from "@/lib/types";

type ScenarioRow = { id: string; scenario: string; plays: PlayStatRow[] };
type PlaySheetResponse = { name: string; playbook: string; scheme: string; scenarios: ScenarioRow[] };

export default function PlaySheetPage() {
  const [sheet, setSheet] = useState<PlaySheetResponse | null>(null);
  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);

  useEffect(() => {
    fetch("/api/playsheet").then((r) => r.json()).then((d: PlaySheetResponse) => setSheet(d));
  }, []);

  const active = useMemo(() => sheet?.scenarios?.find((s) => s.scenario === scenario), [sheet, scenario]);

  return (
    <section className="space-y-4">
      <div><h1 className="font-display text-3xl">{sheet?.name ?? "Power Spread Base"}</h1><p className="text-sm text-slate-400">{sheet?.playbook ?? "Washington State"} — {sheet?.scheme ?? "Power Spread"}</p></div>
      <div className="flex gap-2 overflow-x-auto pb-1">{SCENARIOS.map((s) => <button key={s} onClick={() => setScenario(s)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${s === scenario ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{SCENARIO_SHORT[s]}</button>)}</div>
      <div className="space-y-2">{active?.plays?.map((play) => <div key={play.id} className="flex items-center justify-between rounded bg-slate-900 p-3"><p>{play.formation} → {play.play_name}</p>{play.play_count >= 3 ? <span className={`rounded px-2 py-1 text-xs ${play.success_rate >= 70 ? "bg-emerald-700" : play.success_rate >= 40 ? "bg-amber-700" : "bg-red-700"}`}>{Number(play.avg_yards).toFixed(1)} yds · {play.success_rate}%</span> : null}</div>)}</div>
    </section>
  );
}
