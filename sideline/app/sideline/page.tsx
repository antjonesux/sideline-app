"use client";

import { useEffect, useState } from "react";
import type { PlayStatRow } from "@/lib/types";

type SidelineResponse = { scenario: string; plays: PlayStatRow[] };

export default function SidelinePage() {
  const [situation, setSituation] = useState({ down: 3, distance: 7, side: "OPP", yard_line: 35, hash: "LEFT" });
  const [data, setData] = useState<SidelineResponse>({ scenario: "3rd & Long", plays: [] });
  const [minimal, setMinimal] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ down: String(situation.down), distance: String(situation.distance), side: situation.side, yard_line: String(situation.yard_line), hash: situation.hash });
    fetch(`/api/sideline?${q.toString()}`).then((r) => r.json()).then((d: SidelineResponse) => setData(d));
  }, [situation]);

  return (
    <section className="space-y-4">
      {!minimal ? <><div className="flex items-center justify-between"><h1 className="font-display text-3xl">Sideline</h1><button className="rounded bg-slate-800 px-3 py-1 text-xs" onClick={() => setMinimal(true)}>MINIMAL</button></div><div className="flex flex-wrap gap-2"><button className="rounded bg-slate-800 px-3 py-1" onClick={() => setSituation((s) => ({ ...s, down: s.down === 4 ? 1 : s.down + 1 }))}>DOWN {situation.down}</button><input className="w-20 rounded bg-slate-800 px-2" value={situation.distance} onChange={(e) => setSituation((s) => ({ ...s, distance: Number(e.target.value) }))} /><input className="w-24 rounded bg-slate-800 px-2" value={situation.yard_line} onChange={(e) => setSituation((s) => ({ ...s, yard_line: Number(e.target.value) }))} /><select className="rounded bg-slate-800 px-2" value={situation.hash} onChange={(e) => setSituation((s) => ({ ...s, hash: e.target.value }))}><option>LEFT</option><option>MIDDLE</option><option>RIGHT</option></select></div><p className="text-amber-400">{data.scenario} · {situation.hash} HASH</p></> : <button className="rounded bg-slate-800 px-3 py-1 text-xs" onClick={() => setMinimal(false)}>FULL</button>}
      <div className="space-y-3">{data.plays?.map((play) => <div key={play.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-slate-300">{play.formation}</p><p className="font-display text-2xl">{play.play_name}</p>{play.play_count >= 3 ? <p className="text-right text-sm text-emerald-300">{Number(play.avg_yards).toFixed(1)} · {play.success_rate}%</p> : null}</div>)}</div>
    </section>
  );
}
