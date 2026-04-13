import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: plays } = await supabase.from("logged_plays").select("*").order("created_at", { ascending: false });
  const list = plays ?? [];

  const total = list.length;
  const successes = list.filter((p) => p.is_success).length;
  const avgYards = total ? list.reduce((acc, p) => acc + (p.yards_gained ?? 0), 0) / total : 0;

  const formationMap = new Map<string, { plays: number; success: number }>();
  const scenarioMap = new Map<string, { plays: number; success: number }>();
  const hashMap = new Map<string, { plays: number; success: number; yards: number }>();

  for (const p of list) {
    const f = formationMap.get(p.formation) ?? { plays: 0, success: 0 };
    f.plays += 1;
    if (p.is_success) f.success += 1;
    formationMap.set(p.formation, f);

    const s = scenarioMap.get(p.scenario) ?? { plays: 0, success: 0 };
    s.plays += 1;
    if (p.is_success) s.success += 1;
    scenarioMap.set(p.scenario, s);

    const h = hashMap.get(p.hash) ?? { plays: 0, success: 0, yards: 0 };
    h.plays += 1;
    if (p.is_success) h.success += 1;
    h.yards += p.yards_gained ?? 0;
    hashMap.set(p.hash, h);
  }

  const bestFormation = [...formationMap.entries()].sort((a, b) => b[1].success / b[1].plays - a[1].success / a[1].plays)[0]?.[0] ?? "-";
  const mostUsedFormation = [...formationMap.entries()].sort((a, b) => b[1].plays - a[1].plays)[0]?.[0] ?? "-";
  const bestScenario = [...scenarioMap.entries()].sort((a, b) => b[1].success / b[1].plays - a[1].success / a[1].plays)[0]?.[0] ?? "-";

  const scenarioBreakdown = [...scenarioMap.entries()].map(([scenario, s]) => ({
    scenario,
    success_rate: Math.round((s.success / s.plays) * 100),
  }));

  const hashBreakdown = [...hashMap.entries()].map(([hash, h]) => ({
    hash,
    avg_yards: h.plays ? Number((h.yards / h.plays).toFixed(1)) : 0,
    success_rate: h.plays ? Math.round((h.success / h.plays) * 100) : 0,
  }));

  return NextResponse.json({
    overview: {
      total_plays_logged: total,
      overall_success_rate: total ? `${Math.round((successes / total) * 100)}%` : "0%",
      average_yards_per_play: avgYards.toFixed(1),
      best_formation: bestFormation,
      best_scenario: bestScenario,
      most_used_formation: mostUsedFormation,
    },
    scenarioBreakdown,
    hashBreakdown,
    history: list.slice(0, 100),
  });
}
