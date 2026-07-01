import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  CFB_CATALOG_GAME_VERSION,
  parseCatalogGameVersion,
  parseCatalogSideOfBall,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

async function fetchDistinctPlaybookNames(gameVersion: string, sideOfBall: CatalogSideOfBall): Promise<string[]> {
  const names = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; offset < 200000; offset += pageSize) {
    const { data, error } = await supabase
      .from("playbooks")
      .select("playbook")
      .ilike("game_version", gameVersion)
      .eq("side_of_ball", sideOfBall)
      .not("playbook", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("cfb26-playbooks page:", error);
      throw error;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const p = String((row as { playbook?: string }).playbook ?? "").trim();
      if (p && !p.startsWith("_")) names.add(p);
    }

    if (rows.length < pageSize) break;
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Distinct playbook names from reference plays (for play sheet setup), filtered by catalog game version and side. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lookupPlaybook = searchParams.get("lookup_playbook")?.trim();
  if (lookupPlaybook) {
    const { data, error } = await supabase
      .from("playbooks")
      .select("game_version, side_of_ball")
      .eq("playbook", lookupPlaybook)
      .not("playbook", "is", null);

    if (error) {
      console.error("cfb26-playbooks lookup:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    type MetaRow = { game_version: ReturnType<typeof parseCatalogGameVersion>; side_of_ball: CatalogSideOfBall };
    const unique = new Map<string, MetaRow>();
    for (const row of rows) {
      const side = parseCatalogSideOfBall(row.side_of_ball as string);
      if (!side) continue;
      const gameVersion = parseCatalogGameVersion(row.game_version as string);
      unique.set(`${gameVersion}:${side}`, { game_version: gameVersion, side_of_ball: side });
    }

    const ranked = [...unique.values()].sort((a, b) => {
      if (a.game_version !== b.game_version) return b.game_version.localeCompare(a.game_version);
      if (a.side_of_ball === b.side_of_ball) return 0;
      return a.side_of_ball === "offense" ? -1 : 1;
    });

    const best = ranked[0];
    if (!best) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(best);
  }

  const gameVersion = searchParams.has("game_version")
    ? parseCatalogGameVersion(searchParams.get("game_version"))
    : CFB_CATALOG_GAME_VERSION;

  const sideOfBall = parseCatalogSideOfBall(searchParams.get("side_of_ball"));
  if (!sideOfBall) {
    return NextResponse.json({ error: "side_of_ball is required" }, { status: 400 });
  }

  try {
    const playbooks = await fetchDistinctPlaybookNames(gameVersion, sideOfBall);
    return NextResponse.json({ playbooks });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
}
