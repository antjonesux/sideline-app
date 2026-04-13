import { SCENARIOS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

type PlaySheetPlay = { id: string; play_order: number; formation: string; play_name: string };

async function ensureDefaultSheet() {
  const { data: existing } = await supabase.from("play_sheets").select("*").eq("is_active", true).limit(1).maybeSingle();
  if (existing) return existing;

  const { data: sheet, error } = await supabase.from("play_sheets").insert({ name: "Power Spread Base", playbook: "Washington State", scheme: "Power Spread", is_active: true }).select("*").single();
  if (error || !sheet) return null;

  const scenarios = SCENARIOS.map((scenario, index) => ({ play_sheet_id: sheet.id, scenario, scenario_order: index + 1 }));
  const { data: createdScenarios } = await supabase.from("play_sheet_scenarios").insert(scenarios).select("*");

  for (const scenario of createdScenarios ?? []) {
    await supabase.from("play_sheet_plays").insert([{ scenario_id: scenario.id, play_order: 1, formation: "Pistol U Off", play_name: "HB Zone Wk" }, { scenario_id: scenario.id, play_order: 2, formation: "Pistol Wing Slot", play_name: "PA Deep Out" }]);
  }

  return sheet;
}

export async function GET() {
  const sheet = await ensureDefaultSheet();
  if (!sheet) return NextResponse.json({ name: "Power Spread Base", scenarios: [] });

  const { data: scenarios } = await supabase.from("play_sheet_scenarios").select("*, play_sheet_plays(*)").eq("play_sheet_id", sheet.id).order("scenario_order", { ascending: true });

  const enriched = await Promise.all(
    (scenarios ?? []).map(async (scenario) => {
      const plays = await Promise.all(
        ((scenario.play_sheet_plays as PlaySheetPlay[]) ?? []).map(async (play) => {
          const { data: stats } = await supabase.from("logged_plays").select("yards_gained, is_success").eq("scenario", scenario.scenario).eq("formation", play.formation).eq("play_name", play.play_name);
          const count = stats?.length ?? 0;
          const avg = count ? stats!.reduce((acc, s) => acc + (s.yards_gained ?? 0), 0) / count : 0;
          const success = count ? Math.round((stats!.filter((s) => s.is_success).length / count) * 100) : 0;
          return { ...play, play_count: count, avg_yards: avg, success_rate: success };
        }),
      );
      return { ...scenario, plays };
    }),
  );

  return NextResponse.json({ ...sheet, scenarios: enriched });
}
