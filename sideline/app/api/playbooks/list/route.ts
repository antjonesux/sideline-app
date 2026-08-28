import { parseCatalogGameVersion } from "@/lib/constants";
import { fetchDistinctTendenciesPlaybooks } from "@/lib/tendenciesServer";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawVersion = req.nextUrl.searchParams.get("game_version");
  const gameVersion = rawVersion?.trim() ? parseCatalogGameVersion(rawVersion) : undefined;
  const playbooks = await fetchDistinctTendenciesPlaybooks(supabase, user.id, gameVersion);
  return NextResponse.json({ playbooks });
}
