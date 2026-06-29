import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { CFB_CATALOG_GAME_VERSION, parseCatalogGameVersion } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/** Distinct playbook names from reference plays (for play sheet setup), filtered by catalog game version. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameVersion = searchParams.has("game_version")
    ? parseCatalogGameVersion(searchParams.get("game_version"))
    : CFB_CATALOG_GAME_VERSION;

  const names = new Set<string>();
  // Respect PostgREST row caps (often 1,000) by paging in smaller slices.
  const pageSize = 1000;
  for (let offset = 0; offset < 200000; offset += pageSize) {
    const { data, error } = await supabase
      .from("cfb26_plays")
      .select("playbook")
      .ilike("game_version", gameVersion)
      .not("playbook", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("cfb26-playbooks page:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    const rows = data ?? [];
    for (const row of rows) {
      const p = String((row as { playbook?: string }).playbook ?? "").trim();
      if (p) names.add(p);
    }

    if (rows.length < pageSize) break;
  }

  return NextResponse.json({ playbooks: [...names].sort((a, b) => a.localeCompare(b)) });
}
