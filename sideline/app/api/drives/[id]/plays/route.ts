import { loadCfbPlayTypeMapForPlaybooks, playbookForGame, storedPlayTypeFromMap, type GameRow } from "@/lib/playTypeResolution";
import { createClient } from "@/lib/supabase/server";
import { normalizePlayName, withNormalizedPlayName } from "@/lib/utils";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const [{ data, error }, { data: driveMeta }] = await Promise.all([
    supabase
      .from("logged_plays")
      .select(
        "id, drive_id, game_session_id, play_number, drive_number, down, distance, is_inches, yard_line, side, hash, field_zone, scenario, formation, play_name, yards_gained, result_tag, note, opponent_scheme, situation_override, created_at, play_type",
      )
      .eq("drive_id", id)
      .eq("user_id", user.id)
      .order("play_number", { ascending: true }),
    supabase.from("drives").select("game_session_id").eq("id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (error) return NextResponse.json([], { status: 200 });
  const gameSessionId = String((data ?? [])[0]?.game_session_id ?? driveMeta?.game_session_id ?? "");
  let pb = "";
  let typeMap = new Map<string, string>();
  if (gameSessionId) {
    const { data: gs } = await supabase
      .from("game_sessions")
      .select("my_playbook, offensive_playbook")
      .eq("id", gameSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (gs) {
      pb = playbookForGame(gs as GameRow);
      typeMap = await loadCfbPlayTypeMapForPlaybooks(supabase, pb ? [pb] : []);
    }
  }
  return NextResponse.json(
    (data ?? []).map((row) => {
      const normalized = withNormalizedPlayName(row);
      return {
        ...normalized,
        play_type: storedPlayTypeFromMap(
          pb,
          normalized.formation,
          normalized.play_name,
          typeMap,
          (normalized as { play_type?: string | null }).play_type,
        ),
      };
    }),
  );
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { data: driveRow } = await supabase.from("drives").select("id, game_session_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!driveRow) return NextResponse.json({ error: "Drive not found" }, { status: 404 });

  const sessionId = driveRow.game_session_id as string;

  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { count } = await supabase.from("logged_plays").select("id", { count: "exact", head: true }).eq("drive_id", id).eq("user_id", user.id);

  const down = Number(payload.down);
  const distance = Number(payload.distance);
  const yard_line = Number(payload.yard_line);
  const fieldZone = deriveFieldZone(yard_line, payload.side as "OWN" | "OPP");
  const derivedScenario = deriveScenario(down, distance, fieldZone);
  const scenarioOverride = typeof payload.situation_override === "string" ? payload.situation_override.trim() : "";
  const scenario = scenarioOverride || derivedScenario;

  const isInches = payload.is_inches === true || payload.is_inches === "true";

  let pb = "";
  let typeMap = new Map<string, string>();
  if (sessionId) {
    const { data: gs } = await supabase
      .from("game_sessions")
      .select("my_playbook, offensive_playbook")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (gs) {
      pb = playbookForGame(gs as GameRow);
      typeMap = await loadCfbPlayTypeMapForPlaybooks(supabase, pb ? [pb] : []);
    }
  }

  const formation = String(payload.formation ?? "");
  const play_name = normalizePlayName(String(payload.play_name ?? ""));
  const play_type = storedPlayTypeFromMap(pb, formation, play_name, typeMap, null);

  const insertRow = {
    user_id: user.id,
    drive_id: id,
    game_session_id: sessionId,
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
    formation,
    play_name,
    yards_gained: Number(payload.yards_gained),
    result_tag: String(payload.result_tag ?? ""),
    note: typeof payload.note === "string" ? payload.note : null,
    opponent_scheme: String(payload.opponent_scheme ?? ""),
    situation_override: scenarioOverride || null,
    play_type,
  };

  const { data, error } = await supabase
    .from("logged_plays")
    .insert(insertRow)
    .select(
      "id, drive_id, game_session_id, play_number, drive_number, down, distance, is_inches, yard_line, side, hash, field_zone, scenario, formation, play_name, yards_gained, result_tag, note, opponent_scheme, situation_override, created_at, play_type",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const normalized = data ? withNormalizedPlayName(data) : data;
  return NextResponse.json({
    data: normalized
      ? {
          ...normalized,
          play_type: storedPlayTypeFromMap(
            pb,
            normalized.formation,
            normalized.play_name,
            typeMap,
            (normalized as { play_type?: string | null }).play_type,
          ),
        }
      : normalized,
  });
}
