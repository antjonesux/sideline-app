import { STATIC_WS_CFB26_GROUPED } from "@/lib/staticCfb26WashingtonState";
import {
  listCfb26Formations,
  listCfb26PlaysForFormation,
  loadCfb26PlaysGrouped,
} from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playbook = searchParams.get("playbook");
  const formation = searchParams.get("formation");
  const grouped = searchParams.get("grouped");

  if (!playbook) {
    return NextResponse.json(
      { error: "playbook query param is required" },
      { status: 400 },
    );
  }

  if (formation) {
    let plays = await listCfb26PlaysForFormation(playbook, formation);
    if (!plays.length && playbook === "Washington State") {
      const names = STATIC_WS_CFB26_GROUPED[formation] ?? [];
      plays = names.map((play_name) => ({
        play_name,
        play_type: null,
        is_new_in_26: false,
      }));
    }
    return NextResponse.json({ plays });
  }

  if (grouped === "1" || grouped === "true") {
    const map = await loadCfb26PlaysGrouped(playbook);
    const obj: Record<string, string[]> = {};
    map.forEach((names, f) => {
      obj[f] = names;
    });
    if (
      Object.keys(obj).length === 0 &&
      playbook === "Washington State"
    ) {
      return NextResponse.json({ grouped: STATIC_WS_CFB26_GROUPED });
    }
    return NextResponse.json({ grouped: obj });
  }

  let formations = await listCfb26Formations(playbook);
  if (!formations.length && playbook === "Washington State") {
    formations = Object.keys(STATIC_WS_CFB26_GROUPED).sort();
  }
  return NextResponse.json({ formations });
}
