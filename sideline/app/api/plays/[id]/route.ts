import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  loadCfbPlayTypeMapForDriveSide,
  storedPlayTypeForDriveSide,
  storedPlayTypeFromMap,
  type GameSessionForPlayType,
} from "@/lib/playTypeResolution";
import { createClient } from "@/lib/supabase/server";
import { normalizePlayName, withNormalizedPlayName } from "@/lib/utils";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { normalizeDefensiveResultTags } from "@/lib/defensiveResultTags";
import { driveSideOfBall } from "@/lib/filmGameDetailHelpers";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const down = Number(payload.down);
  const distance = Number(payload.distance);
  const yard_line = Number(payload.yard_line);
  const fieldZone = deriveFieldZone(yard_line, payload.side as "OWN" | "OPP");
  const derivedScenario = deriveScenario(down, distance, fieldZone);
  const scenarioOverride = typeof payload.situation_override === "string" ? payload.situation_override.trim() : "";
  const scenario = scenarioOverride || derivedScenario;

  const isInches = payload.is_inches === true || payload.is_inches === "true";

  const formation = String(payload.formation ?? "");
  const play_name = normalizePlayName(String(payload.play_name ?? ""));

  const { data: existing } = await supabase
    .from("logged_plays")
    .select("game_session_id, play_type, drive_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const sessionId = String(existing?.game_session_id ?? "");
  let pb = "";
  let typeMap = new Map<string, string>();
  let driveSide: "offense" | "defense" = "offense";
  if (sessionId) {
    const [{ data: gs }, { data: driveRow }] = await Promise.all([
      supabase
        .from("game_sessions")
        .select("my_playbook, offensive_playbook, opponent_scheme, game_version")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle(),
      existing?.drive_id
        ? supabase.from("drives").select("side_of_ball").eq("id", existing.drive_id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (gs) {
      driveSide = driveSideOfBall(driveRow ?? {});
      const resolved = await loadCfbPlayTypeMapForDriveSide(
        supabase,
        gs as GameSessionForPlayType,
        driveSide,
      );
      pb = resolved.playbook;
      typeMap = resolved.typeMap;
    }
  }
  const resolvedDisplayType = storedPlayTypeForDriveSide(
    driveSide,
    pb,
    formation,
    play_name,
    typeMap,
    existing?.play_type ?? null,
  );
  const play_type =
    driveSide === "defense"
      ? "RUN"
      : storedPlayTypeFromMap(pb, formation, play_name, typeMap, existing?.play_type ?? null);
  const resultTags =
    payload.result_tags !== undefined ? normalizeDefensiveResultTags(payload.result_tags) : undefined;

  const updateRow = {
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
    ...(resultTags !== undefined ? { result_tags: resultTags } : {}),
    note: typeof payload.note === "string" ? payload.note : null,
    opponent_scheme: String(payload.opponent_scheme ?? ""),
    situation_override: scenarioOverride || null,
    drive_number: typeof payload.drive_number === "number" ? payload.drive_number : null,
    play_type,
  };

  const { data, error } = await supabase
    .from("logged_plays")
    .update(updateRow)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("logged_plays update:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  const normalized = data ? withNormalizedPlayName(data) : data;
  return NextResponse.json({
    data: normalized
      ? {
          ...normalized,
          play_type:
            resolvedDisplayType ??
            storedPlayTypeForDriveSide(
              driveSide,
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

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await supabase.from("logged_plays").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("logged_plays delete:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  return NextResponse.json({ data: { ok: true } });
}
