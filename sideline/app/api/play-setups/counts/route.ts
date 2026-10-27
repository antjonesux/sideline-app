import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { parseCatalogSideOfBall } from "@/lib/constants";
import { requireCatalogGameVersion } from "@/lib/playSetupApi";
import { buildPlaySetupPlaybookPrefix } from "@/lib/playSetupKey";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns `{ data: Record<play_key, number> }` for one playbook.
 * Clients build matching keys with `buildPlaySetupKey` from `@/lib/playSetupKey`
 * (same pure helper used server-side).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const game_version = requireCatalogGameVersion(params.get("game_version"));
  const side = parseCatalogSideOfBall(params.get("side_of_ball"));
  const playbook = (params.get("playbook") ?? "").trim();

  if (!game_version || !side || !playbook) {
    return NextResponse.json(
      { error: "game_version, side_of_ball, and playbook are required" },
      { status: 400 },
    );
  }

  const prefix = buildPlaySetupPlaybookPrefix({ game_version, side_of_ball: side, playbook });

  const { data: rows, error } = await supabase
    .from("play_setups")
    .select("play_key")
    .eq("user_id", user.id)
    .like("play_key", `${prefix}%`);

  if (error) {
    console.error("play-setups counts GET:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const data: Record<string, number> = {};
  for (const row of rows ?? []) {
    const key = String((row as { play_key?: string }).play_key ?? "");
    if (!key) continue;
    data[key] = (data[key] ?? 0) + 1;
  }

  return NextResponse.json({ data });
}
