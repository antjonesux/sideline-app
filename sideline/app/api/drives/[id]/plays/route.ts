import { supabase } from "@/lib/supabase";
import { normalizePlayName, withNormalizedPlayName } from "@/lib/utils";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase
    .from("logged_plays")
    .select(
      "id, drive_id, game_session_id, play_number, drive_number, down, distance, is_inches, yard_line, side, hash, field_zone, scenario, formation, play_name, yards_gained, result_tag, note, opponent_scheme, situation_override, created_at",
    )
    .eq("drive_id", id)
    .order("play_number", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json((data ?? []).map(withNormalizedPlayName));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { count } = await supabase.from("logged_plays").select("id", { count: "exact", head: true }).eq("drive_id", id);

  const down = Number(payload.down);
  const distance = Number(payload.distance);
  const yard_line = Number(payload.yard_line);
  const fieldZone = deriveFieldZone(yard_line, payload.side as "OWN" | "OPP");
  const derivedScenario = deriveScenario(down, distance, fieldZone);
  const scenarioOverride = typeof payload.situation_override === "string" ? payload.situation_override.trim() : "";
  const scenario = scenarioOverride || derivedScenario;

  const isInches = payload.is_inches === true || payload.is_inches === "true";

  const insertRow = {
    drive_id: id,
    game_session_id: String(payload.game_session_id ?? ""),
    play_number: (count ?? 0) + 1,
    drive_number: typeof payload.drive_number === "number" ? payload.drive_number : null,
    down,
    distance,
    is_inches: isInches,
    yard_line,
    side: payload.side as "OWN" | "OPP",
    hash: (payload.hash as "LEFT" | "MIDDLE" | "RIGHT") ?? "MIDDLE",
    field_zone: fieldZone,
    scenario,
    formation: String(payload.formation ?? ""),
    play_name: normalizePlayName(String(payload.play_name ?? "")),
    yards_gained: Number(payload.yards_gained),
    result_tag: String(payload.result_tag ?? ""),
    note: typeof payload.note === "string" ? payload.note : null,
    opponent_scheme: String(payload.opponent_scheme ?? ""),
    situation_override: scenarioOverride || null,
  };

  const { data, error } = await supabase
    .from("logged_plays")
    .insert(insertRow)
    .select(
      "id, drive_id, game_session_id, play_number, drive_number, down, distance, is_inches, yard_line, side, hash, field_zone, scenario, formation, play_name, yards_gained, result_tag, note, opponent_scheme, situation_override, created_at",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ? withNormalizedPlayName(data) : data });
}
